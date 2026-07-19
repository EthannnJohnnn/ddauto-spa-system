import { Router } from 'express';
import { validateBody, validateParams } from '../../middleware/validate.js';
import { createCatalogsController } from './catalogs.controller.js';
import {
  archiveSchema,
  createEmployeeSchema,
  createServiceSchema,
  createVehicleClassSchema,
  idParamsSchema,
  setServicePriceSchema,
  updateEmployeeSchema,
  updateServiceSchema,
  updateVehicleClassSchema,
} from './catalogs.schemas.js';

export function createCatalogsRouter(service, authMiddleware) {
  const router = Router();
  const controller = createCatalogsController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/', controller.list);

  router.post(
    '/employees',
    ...ownerMutation,
    validateBody(createEmployeeSchema),
    controller.createEmployee,
  );
  router.patch(
    '/employees/:id',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(updateEmployeeSchema),
    controller.updateEmployee,
  );
  router.post(
    '/employees/:id/archive',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(archiveSchema),
    controller.archiveEmployee,
  );
  router.post(
    '/employees/:id/restore',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(archiveSchema),
    controller.restoreEmployee,
  );

  router.post(
    '/vehicle-classes',
    ...ownerMutation,
    validateBody(createVehicleClassSchema),
    controller.createVehicleClass,
  );
  router.patch(
    '/vehicle-classes/:id',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(updateVehicleClassSchema),
    controller.updateVehicleClass,
  );
  router.post(
    '/vehicle-classes/:id/archive',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(archiveSchema),
    controller.archiveVehicleClass,
  );
  router.post(
    '/vehicle-classes/:id/restore',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(archiveSchema),
    controller.restoreVehicleClass,
  );

  router.post(
    '/services',
    ...ownerMutation,
    validateBody(createServiceSchema),
    controller.createService,
  );
  router.patch(
    '/services/:id',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(updateServiceSchema),
    controller.updateService,
  );
  router.post(
    '/services/:id/archive',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(archiveSchema),
    controller.archiveService,
  );
  router.post(
    '/services/:id/restore',
    ...ownerMutation,
    validateParams(idParamsSchema),
    validateBody(archiveSchema),
    controller.restoreService,
  );

  router.put(
    '/service-prices',
    ...ownerMutation,
    validateBody(setServicePriceSchema),
    controller.setServicePrice,
  );

  return router;
}
