import { Router } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { createAttendanceController } from './attendance.controller.js';
import { attendanceOpenQuerySchema, attendanceReviewSchema } from './attendance.schemas.js';

export function createAttendanceRouter(service, authMiddleware) {
  const router = Router();
  const controller = createAttendanceController(service);
  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/open', validateQuery(attendanceOpenQuerySchema), controller.open);
  router.post(
    '/review',
    authMiddleware.requireOwner,
    authMiddleware.requireCsrf,
    validateBody(attendanceReviewSchema),
    controller.review,
  );
  return router;
}
