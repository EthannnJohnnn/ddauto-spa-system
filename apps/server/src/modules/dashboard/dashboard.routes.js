import { Router } from 'express';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate.js';
import { createDashboardController } from './dashboard.controller.js';
import {
  dashboardNoteIdParamsSchema,
  dashboardNoteReasonSchema,
  dashboardNoteSchema,
  dashboardNotesQuerySchema,
} from './dashboard.schemas.js';

export function createDashboardRouter(service, authMiddleware) {
  const router = Router();
  const controller = createDashboardController(service);
  const ownerMutation = [authMiddleware.requireOwner, authMiddleware.requireCsrf];

  router.use(authMiddleware.optionalAuth, authMiddleware.requireAuth);
  router.get('/notes', validateQuery(dashboardNotesQuerySchema), controller.listNotes);
  router.post('/notes', ...ownerMutation, validateBody(dashboardNoteSchema), controller.createNote);
  router.patch(
    '/notes/:id',
    ...ownerMutation,
    validateParams(dashboardNoteIdParamsSchema),
    validateBody(dashboardNoteSchema),
    controller.updateNote,
  );
  router.post(
    '/notes/:id/archive',
    ...ownerMutation,
    validateParams(dashboardNoteIdParamsSchema),
    validateBody(dashboardNoteReasonSchema),
    controller.archiveNote,
  );
  router.post(
    '/notes/:id/restore',
    ...ownerMutation,
    validateParams(dashboardNoteIdParamsSchema),
    validateBody(dashboardNoteReasonSchema),
    controller.restoreNote,
  );
  return router;
}
