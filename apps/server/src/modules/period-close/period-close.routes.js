import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { createPeriodCloseController } from './period-close.controller.js';
import {
  periodCloseIdParamsSchema,
  periodCloseInputSchema,
  periodClosePreviewQuerySchema,
  periodCloseVoidSchema,
} from './period-close.schemas.js';

export function createPeriodCloseRouter(service, authMiddleware) {
  const router = Router();
  const controller = createPeriodCloseController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];
  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/preview', validateQuery(periodClosePreviewQuerySchema), controller.preview);
  router.get('/history', controller.history);
  router.post('/pay', ...ownerMutation, validateBody(periodCloseInputSchema), controller.pay);
  router.post(
    '/:id/void',
    ...ownerMutation,
    validateParams(periodCloseIdParamsSchema),
    validateBody(periodCloseVoidSchema),
    controller.voidPayment,
  );
  return router;
}
