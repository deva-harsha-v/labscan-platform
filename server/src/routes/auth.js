import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { login, loginSchema, refresh, logout, me } from '../controllers/authController.js';

const router = Router();

router.post('/login', loginRateLimiter, validate('body', loginSchema), asyncHandler(login));
router.post('/refresh', loginRateLimiter, asyncHandler(refresh));
router.post('/logout', asyncHandler(logout));
router.get('/me', requireAuth, asyncHandler(me));

export default router;
