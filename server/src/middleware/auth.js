import { verifyAccessToken } from '../utils/jwt.js';
import { unauthorized, forbidden } from '../utils/errors.js';

/**
 * Requires a valid access token. Populates req.user = { id, role, username }.
 */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized('Missing or malformed Authorization header'));
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired access token'));
  }
}

/**
 * Restricts a route to one or more roles. Use after requireAuth.
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('Insufficient role'));
    return next();
  };
}
