import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Access tokens carry identity + role for stateless authorization.
 */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.user_id, role: user.role, username: user.username, type: 'access' },
    env.auth.accessSecret,
    { expiresIn: env.auth.accessTtl },
  );
}

/**
 * Refresh tokens carry the user's token_version so a password reset /
 * "log out everywhere" can invalidate all previously issued refresh tokens.
 */
export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.user_id, tokenVersion: user.token_version, type: 'refresh' },
    env.auth.refreshSecret,
    { expiresIn: env.auth.refreshTtl },
  );
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.auth.accessSecret);
  if (payload.type !== 'access') throw new Error('Invalid token type');
  return payload;
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.auth.refreshSecret);
  if (payload.type !== 'refresh') throw new Error('Invalid token type');
  return payload;
}
