import { z } from 'zod';
import { query } from '../config/db.js';
import { verifyPassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/errors.js';
import { env } from '../config/env.js';

export const loginSchema = z.object({
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(255),
});

const REFRESH_COOKIE = 'labscan_refresh';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/api/auth',
    // Cookie lifetime mirrors the refresh token TTL loosely (7d default).
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function publicUser(u) {
  return { id: u.user_id, username: u.username, role: u.role };
}

/**
 * Unified login endpoint. The role is derived from the stored account, so the
 * Admin and Student login screens can share this endpoint. Callers may pass an
 * optional `expectedRole` to reject cross-portal logins.
 */
export async function login(req, res) {
  const { username, password } = req.body;
  const expectedRole = req.query.role;

  const rows = await query(
    'SELECT user_id, username, password_hash, role, token_version FROM users WHERE username = :username LIMIT 1',
    { username },
  );
  const user = rows[0];

  // Constant-ish response regardless of whether the user exists.
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !ok) {
    throw unauthorized('Invalid credentials');
  }
  if (expectedRole && user.role !== expectedRole) {
    throw unauthorized('Invalid credentials');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.json({ accessToken, refreshToken, user: publicUser(user) });
}

export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  if (!token) throw unauthorized('Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw unauthorized('Invalid or expired refresh token');
  }

  const rows = await query(
    'SELECT user_id, username, role, token_version FROM users WHERE user_id = :id LIMIT 1',
    { id: payload.sub },
  );
  const user = rows[0];
  if (!user || user.token_version !== payload.tokenVersion) {
    throw unauthorized('Refresh token has been revoked');
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  res.json({ accessToken, refreshToken, user: publicUser(user) });
}

export async function logout(req, res) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.status(204).end();
}

export async function me(req, res) {
  const rows = await query(
    'SELECT user_id, username, role, created_at FROM users WHERE user_id = :id LIMIT 1',
    { id: req.user.id },
  );
  if (!rows[0]) throw unauthorized();
  res.json({ user: publicUser(rows[0]) });
}
