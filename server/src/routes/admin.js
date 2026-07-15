import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createStudent,
  createStudentSchema,
  listStudents,
  getUser,
  deleteStudent,
} from '../controllers/userController.js';
import {
  createLab,
  createLabSchema,
  listLabs,
  getLab,
  updateLab,
  updateLabSchema,
  deleteLab,
} from '../controllers/labController.js';
import {
  createExperiment,
  createExperimentSchema,
  listExperimentsByLab,
  getExperiment,
  updateExperiment,
  updateExperimentSchema,
  deleteExperiment,
  reassignMarker,
  reassignMarkerSchema,
} from '../controllers/experimentController.js';
import {
  createContentVersion,
  createContentVersionSchema,
  listContentVersions,
  getContentVersion,
  getActiveContent,
  createUploadUrl,
  uploadUrlSchema,
} from '../controllers/contentController.js';
import { listAuditLogs, auditQuerySchema } from '../controllers/auditController.js';

const router = Router();

// All admin routes require an authenticated admin.
router.use(requireAuth, requireRole('admin'));

// --- Students ---
router.post('/students', validate('body', createStudentSchema), asyncHandler(createStudent));
router.get('/students', asyncHandler(listStudents));
router.get('/users/:id', asyncHandler(getUser));
router.delete('/students/:id', asyncHandler(deleteStudent));

// --- Labs ---
router.post('/labs', validate('body', createLabSchema), asyncHandler(createLab));
router.get('/labs', asyncHandler(listLabs));
router.get('/labs/:id', asyncHandler(getLab));
router.patch('/labs/:id', validate('body', updateLabSchema), asyncHandler(updateLab));
router.delete('/labs/:id', asyncHandler(deleteLab));

// --- Experiments ---
router.post(
  '/labs/:labId/experiments',
  validate('body', createExperimentSchema),
  asyncHandler(createExperiment),
);
router.get('/labs/:labId/experiments', asyncHandler(listExperimentsByLab));
router.get('/experiments/:id', asyncHandler(getExperiment));
router.patch(
  '/experiments/:id',
  validate('body', updateExperimentSchema),
  asyncHandler(updateExperiment),
);
router.delete('/experiments/:id', asyncHandler(deleteExperiment));
router.post(
  '/experiments/:id/marker',
  validate('body', reassignMarkerSchema),
  asyncHandler(reassignMarker),
);

// --- Content versions ---
router.post(
  '/experiments/:id/content-versions',
  validate('body', createContentVersionSchema),
  asyncHandler(createContentVersion),
);
router.get('/experiments/:id/content-versions', asyncHandler(listContentVersions));
router.get('/experiments/:id/active-content', asyncHandler(getActiveContent));
router.get('/content-versions/:id', asyncHandler(getContentVersion));

// --- Media upload (signed PUT URL) ---
router.post('/media/upload-url', validate('body', uploadUrlSchema), asyncHandler(createUploadUrl));

// --- Audit logs ---
router.get('/audit-logs', validate('query', auditQuerySchema), asyncHandler(listAuditLogs));

export default router;
