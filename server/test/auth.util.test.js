import { describe, it, expect } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/utils/jwt.js';
import { hashPassword, verifyPassword } from '../src/utils/password.js';

const user = { user_id: 'u-1', username: 'alice', role: 'admin', token_version: 3 };

describe('jwt utils', () => {
  it('round-trips an access token with identity + role', () => {
    const token = signAccessToken(user);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('u-1');
    expect(payload.role).toBe('admin');
    expect(payload.type).toBe('access');
  });

  it('round-trips a refresh token carrying token_version', () => {
    const token = signRefreshToken(user);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe('u-1');
    expect(payload.tokenVersion).toBe(3);
  });

  it('rejects using an access token as a refresh token', () => {
    const token = signAccessToken(user);
    expect(() => verifyRefreshToken(token)).toThrow();
  });
});

describe('password utils', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('s3cret-password');
    expect(hash).not.toBe('s3cret-password');
    expect(await verifyPassword('s3cret-password', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
