import { Router } from 'express';
import { validateQuery } from '../../middleware/validate.js';
import { createReportsController } from './reports.controller.js';
import { reportsExcelQuerySchema, reportsOverviewQuerySchema } from './reports.schemas.js';

export function createReportsRouter(service, authMiddleware) {
  const router = Router();
  const controller = createReportsController(service);

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/overview', validateQuery(reportsOverviewQuerySchema), controller.overview);
  router.get(
    '/excel',
    authMiddleware.requireOwner,
    validateQuery(reportsExcelQuerySchema),
    controller.excel,
  );

  return router;
}
