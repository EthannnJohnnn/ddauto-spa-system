import { Router } from 'express';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { createPayrollController } from './payroll.controller.js';
import {
  closePayrollSchema,
  dailyPayrollQuerySchema,
  reopenPayrollSchema,
} from './payroll.schemas.js';

export function createPayrollRouter(service, authMiddleware) {
  const router = Router();
  const controller = createPayrollController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/daily', validateQuery(dailyPayrollQuerySchema), controller.daily);
  router.post('/close', ...ownerMutation, validateBody(closePayrollSchema), controller.close);
  router.post('/reopen', ...ownerMutation, validateBody(reopenPayrollSchema), controller.reopen);

  return router;
}
