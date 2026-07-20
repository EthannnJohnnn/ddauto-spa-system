import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { createTireInventoryController } from './tire-inventory.controller.js';
import {
  createTireProductSchema,
  tireDocumentSchema,
  tireIdParamsSchema,
  tireOverviewQuerySchema,
  tireStatusReasonSchema,
  updateTireProductSchema,
} from './tire-inventory.schemas.js';

export function createTireInventoryRouter(service, authMiddleware) {
  const router = Router();
  const controller = createTireInventoryController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/overview', validateQuery(tireOverviewQuerySchema), controller.overview);

  router.post(
    '/products',
    ...ownerMutation,
    validateBody(createTireProductSchema),
    controller.createProduct,
  );
  router.patch(
    '/products/:id',
    ...ownerMutation,
    validateParams(tireIdParamsSchema),
    validateBody(updateTireProductSchema),
    controller.updateProduct,
  );
  router.post(
    '/products/:id/archive',
    ...ownerMutation,
    validateParams(tireIdParamsSchema),
    validateBody(tireStatusReasonSchema),
    controller.archiveProduct,
  );
  router.post(
    '/products/:id/restore',
    ...ownerMutation,
    validateParams(tireIdParamsSchema),
    validateBody(tireStatusReasonSchema),
    controller.restoreProduct,
  );

  router.post(
    '/documents',
    ...ownerMutation,
    validateBody(tireDocumentSchema),
    controller.createDocument,
  );
  router.patch(
    '/documents/:id',
    ...ownerMutation,
    validateParams(tireIdParamsSchema),
    validateBody(tireDocumentSchema),
    controller.updateDocument,
  );
  router.post(
    '/documents/:id/void',
    ...ownerMutation,
    validateParams(tireIdParamsSchema),
    validateBody(tireStatusReasonSchema),
    controller.voidDocument,
  );
  router.post(
    '/documents/:id/restore',
    ...ownerMutation,
    validateParams(tireIdParamsSchema),
    validateBody(tireStatusReasonSchema),
    controller.restoreDocument,
  );

  return router;
}
