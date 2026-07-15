import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  listGhostExperiments,
  getGhostExperiment,
  getGhostByMarker,
} from '../controllers/ghostController.js';

// Public, unauthenticated. Learning-stage content only: no timers, checklist,
// sessions, or persistence.
const router = Router();

router.get('/experiments', asyncHandler(listGhostExperiments));
router.get('/experiments/:id', asyncHandler(getGhostExperiment));
router.get('/scan/:marker', asyncHandler(getGhostByMarker));

export default router;
