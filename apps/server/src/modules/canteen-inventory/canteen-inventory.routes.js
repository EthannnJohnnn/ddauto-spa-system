import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { createCanteenInventoryController } from './canteen-inventory.controller.js';
import {
  createCanteenProductSchema,
  canteenDocumentSchema,
  canteenIdParamsSchema,
  canteenOverviewQuerySchema,
  canteenStatusReasonSchema,
  updateCanteenProductSchema,
} from './canteen-inventory.schemas.js';

export function createCanteenInventoryRouter(service, authMiddleware) {
  const router = Router();
  const controller = createCanteenInventoryController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/overview', validateQuery(canteenOverviewQuerySchema), controller.overview);

  router.post(
    '/products',
    ...ownerMutation,
    validateBody(createCanteenProductSchema),
    controller.createProduct,
  );
  router.patch(
    '/products/:id',
    ...ownerMutation,
    validateParams(canteenIdParamsSchema),
    validateBody(updateCanteenProductSchema),
    controller.updateProduct,
  );
  router.post(
    '/products/:id/archive',
    ...ownerMutation,
    validateParams(canteenIdParamsSchema),
    validateBody(canteenStatusReasonSchema),
    controller.archiveProduct,
  );
  router.post(
    '/products/:id/restore',
    ...ownerMutation,
    validateParams(canteenIdParamsSchema),
    validateBody(canteenStatusReasonSchema),
    controller.restoreProduct,
  );

  router.post(
    '/documents',
    ...ownerMutation,
    validateBody(canteenDocumentSchema),
    controller.createDocument,
  );
  router.patch(
    '/documents/:id',
    ...ownerMutation,
    validateParams(canteenIdParamsSchema),
    validateBody(canteenDocumentSchema),
    controller.updateDocument,
  );
  router.post(
    '/documents/:id/void',
    ...ownerMutation,
    validateParams(canteenIdParamsSchema),
    validateBody(canteenStatusReasonSchema),
    controller.voidDocument,
  );
  router.post(
    '/documents/:id/restore',
    ...ownerMutation,
    validateParams(canteenIdParamsSchema),
    validateBody(canteenStatusReasonSchema),
    controller.restoreDocument,
  );

  return router;
}
