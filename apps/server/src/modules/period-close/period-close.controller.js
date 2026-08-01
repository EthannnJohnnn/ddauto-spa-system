export function createPeriodCloseController(service) {
  return {
    preview(request, response) {
      response.json(service.preview(request.validatedQuery));
    },
    history(_request, response) {
      response.json(service.history());
    },
    close(request, response) {
      response.status(201).json(service.close(request.validatedBody, request.auth.user.id));
    },
    reopen(request, response) {
      response.json(
        service.reopen(
          request.validatedParams.id,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },
  };
}
