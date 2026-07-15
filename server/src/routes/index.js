import { Router } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import studentRoutes from './student.js';
import ghostRoutes from './ghost.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/student', studentRoutes);
router.use('/ghost', ghostRoutes);

export default router;
