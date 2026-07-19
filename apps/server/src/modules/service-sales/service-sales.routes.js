import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { createServiceSalesController } from './service-sales.controller.js';
import {
  attendanceSchema,
  dailySalesQuerySchema,
  serviceTicketSchema,
  statusReasonSchema,
  ticketIdParamsSchema,
} from './service-sales.schemas.js';

export function createServiceSalesRouter(service, authMiddleware) {
  const router = Router();
  const controller = createServiceSalesController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/daily', validateQuery(dailySalesQuerySchema), controller.daily);
  router.post(
    '/tickets',
    ...ownerMutation,
    validateBody(serviceTicketSchema),
    controller.createTicket,
  );
  router.patch(
    '/tickets/:id',
    ...ownerMutation,
    validateParams(ticketIdParamsSchema),
    validateBody(serviceTicketSchema),
    controller.updateTicket,
  );
  router.post(
    '/tickets/:id/void',
    ...ownerMutation,
    validateParams(ticketIdParamsSchema),
    validateBody(statusReasonSchema),
    controller.voidTicket,
  );
  router.post(
    '/tickets/:id/restore',
    ...ownerMutation,
    validateParams(ticketIdParamsSchema),
    validateBody(statusReasonSchema),
    controller.restoreTicket,
  );
  router.put(
    '/attendance',
    ...ownerMutation,
    validateBody(attendanceSchema),
    controller.attendance,
  );

  return router;
}
