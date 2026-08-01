import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { createPeriodCloseController } from './period-close.controller.js';
import {
  periodCloseIdParamsSchema,
  periodCloseInputSchema,
  periodClosePreviewQuerySchema,
  periodCloseReopenSchema,
} from './period-close.schemas.js';

export function createPeriodCloseRouter(service, authMiddleware) {
  const router = Router();
  const controller = createPeriodCloseController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];
  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/preview', validateQuery(periodClosePreviewQuerySchema), controller.preview);
  router.get('/history', controller.history);
  router.post('/close', ...ownerMutation, validateBody(periodCloseInputSchema), controller.close);
  router.post(
    '/:id/reopen',
    ...ownerMutation,
    validateParams(periodCloseIdParamsSchema),
    validateBody(periodCloseReopenSchema),
    controller.reopen,
  );
  return router;
}
