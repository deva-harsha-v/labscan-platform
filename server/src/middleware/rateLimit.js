import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Aggressive limiter for authentication endpoints to slow credential stuffing.
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.rateLimit.loginWindowMs,
  max: env.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later.' } },
});

/**
 * Broad limiter applied to the whole API as a baseline.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
