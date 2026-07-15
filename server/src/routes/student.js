import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  resolveMarker,
  listExperimentsForStudent,
} from '../controllers/experimentController.js';
import {
  startSession,
  startSessionSchema,
  listMySessions,
  getSession,
  completeLearningStage,
  updateVideoProgress,
  videoProgressSchema,
  completeVisualStage,
  toggleChecklistItem,
  checklistToggleSchema,
  completeSession,
  getVideoSignedUrl,
} from '../controllers/sessionController.js';

const router = Router();

// All student routes require an authenticated student.
router.use(requireAuth, requireRole('student'));

// Discovery
router.get('/experiments', asyncHandler(listExperimentsForStudent));
router.get('/scan/:marker', asyncHandler(resolveMarker));

// Sessions
router.post('/sessions', validate('body', startSessionSchema), asyncHandler(startSession));
router.get('/sessions', asyncHandler(listMySessions));
router.get('/sessions/:id', asyncHandler(getSession));
router.post('/sessions/:id/learning-complete', asyncHandler(completeLearningStage));
router.post(
  '/sessions/:id/video-progress',
  validate('body', videoProgressSchema),
  asyncHandler(updateVideoProgress),
);
router.post('/sessions/:id/visual-complete', asyncHandler(completeVisualStage));
router.get('/sessions/:id/videos/:videoId/signed-url', asyncHandler(getVideoSignedUrl));
router.patch(
  '/sessions/:id/checklist/:itemId',
  validate('body', checklistToggleSchema),
  asyncHandler(toggleChecklistItem),
);
router.post('/sessions/:id/complete', asyncHandler(completeSession));

export default router;
