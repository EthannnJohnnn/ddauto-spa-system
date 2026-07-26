import { Router } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { createDailyCloseController } from './daily-close.controller.js';
import {
  closeBusinessDateSchema,
  dailyCloseQuerySchema,
  reopenBusinessDateSchema,
} from './daily-close.schemas.js';

export function createDailyCloseRouter(service, authMiddleware) {
  const router = Router();
  const controller = createDailyCloseController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/daily', validateQuery(dailyCloseQuerySchema), controller.daily);
  router.post('/close', ...ownerMutation, validateBody(closeBusinessDateSchema), controller.close);
  router.post(
    '/reopen',
    ...ownerMutation,
    validateBody(reopenBusinessDateSchema),
    controller.reopen,
  );
  return router;
}
