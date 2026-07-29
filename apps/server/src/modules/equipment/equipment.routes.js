import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { createEquipmentController } from './equipment.controller.js';
import {
  createEquipmentBatchSchema,
  equipmentCategorySchema,
  equipmentIdParamsSchema,
  equipmentOverviewQuerySchema,
  equipmentReasonSchema,
  equipmentRepairSchema,
  updateEquipmentBatchSchema,
  updateEquipmentItemSchema,
} from './equipment.schemas.js';

export function createEquipmentRouter(service, authMiddleware) {
  const router = Router();
  const controller = createEquipmentController(service);
  const owner = [authMiddleware.requireOwner, authMiddleware.requireCsrf];
  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/overview', validateQuery(equipmentOverviewQuerySchema), controller.overview);
  router.post(
    '/categories',
    ...owner,
    validateBody(equipmentCategorySchema),
    controller.createCategory,
  );
  router.patch(
    '/categories/:id',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentCategorySchema),
    controller.updateCategory,
  );
  router.post(
    '/categories/:id/archive',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentReasonSchema),
    controller.archiveCategory,
  );
  router.post(
    '/categories/:id/restore',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentReasonSchema),
    controller.restoreCategory,
  );
  router.post(
    '/batches',
    ...owner,
    validateBody(createEquipmentBatchSchema),
    controller.createBatch,
  );
  router.patch(
    '/batches/:id',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(updateEquipmentBatchSchema),
    controller.updateBatch,
  );
  router.patch(
    '/items/:id',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(updateEquipmentItemSchema),
    controller.updateItem,
  );
  router.post(
    '/items/:id/archive',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentReasonSchema),
    controller.archiveItem,
  );
  router.post(
    '/items/:id/restore',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentReasonSchema),
    controller.restoreItem,
  );
  router.post(
    '/items/:id/repairs',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentRepairSchema),
    controller.createRepair,
  );
  router.patch(
    '/repairs/:id',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentRepairSchema),
    controller.updateRepair,
  );
  router.post(
    '/repairs/:id/void',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentReasonSchema),
    controller.voidRepair,
  );
  router.post(
    '/repairs/:id/restore',
    ...owner,
    validateParams(equipmentIdParamsSchema),
    validateBody(equipmentReasonSchema),
    controller.restoreRepair,
  );
  return router;
}
