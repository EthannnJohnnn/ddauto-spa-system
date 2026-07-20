import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { createPurchasesExpensesController } from './purchases-expenses.controller.js';
import {
  createExpenseCategorySchema,
  expenseTransactionSchema,
  purchasesExpensesIdParamsSchema,
  purchasesExpensesOverviewQuerySchema,
  purchasesExpensesStatusReasonSchema,
  updateExpenseCategorySchema,
} from './purchases-expenses.schemas.js';

export function createPurchasesExpensesRouter(service, authMiddleware) {
  const router = Router();
  const controller = createPurchasesExpensesController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/overview', validateQuery(purchasesExpensesOverviewQuerySchema), controller.overview);

  router.post(
    '/categories',
    ...ownerMutation,
    validateBody(createExpenseCategorySchema),
    controller.createCategory,
  );
  router.patch(
    '/categories/:id',
    ...ownerMutation,
    validateParams(purchasesExpensesIdParamsSchema),
    validateBody(updateExpenseCategorySchema),
    controller.updateCategory,
  );
  router.post(
    '/categories/:id/archive',
    ...ownerMutation,
    validateParams(purchasesExpensesIdParamsSchema),
    validateBody(purchasesExpensesStatusReasonSchema),
    controller.archiveCategory,
  );
  router.post(
    '/categories/:id/restore',
    ...ownerMutation,
    validateParams(purchasesExpensesIdParamsSchema),
    validateBody(purchasesExpensesStatusReasonSchema),
    controller.restoreCategory,
  );

  router.post(
    '/expenses',
    ...ownerMutation,
    validateBody(expenseTransactionSchema),
    controller.createExpense,
  );
  router.patch(
    '/expenses/:id',
    ...ownerMutation,
    validateParams(purchasesExpensesIdParamsSchema),
    validateBody(expenseTransactionSchema),
    controller.updateExpense,
  );
  router.post(
    '/expenses/:id/void',
    ...ownerMutation,
    validateParams(purchasesExpensesIdParamsSchema),
    validateBody(purchasesExpensesStatusReasonSchema),
    controller.voidExpense,
  );
  router.post(
    '/expenses/:id/restore',
    ...ownerMutation,
    validateParams(purchasesExpensesIdParamsSchema),
    validateBody(purchasesExpensesStatusReasonSchema),
    controller.restoreExpense,
  );

  return router;
}
