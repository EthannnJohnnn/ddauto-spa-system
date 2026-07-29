export function createDashboardController(service) {
  return {
    listNotes: (request, response) => response.json(service.listNotes(request.validatedQuery)),
    createNote: (request, response) =>
      response.status(201).json(service.createNote(request.validatedBody, request.auth.user.id)),
    updateNote: (request, response) =>
      response.json(
        service.updateNote(request.validatedParams.id, request.validatedBody, request.auth.user.id),
      ),
    archiveNote: (request, response) =>
      response.json(
        service.setNoteActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      ),
    restoreNote: (request, response) =>
      response.json(
        service.setNoteActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      ),
  };
}
