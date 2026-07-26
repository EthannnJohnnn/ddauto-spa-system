export function createDailyCloseController(service) {
  return {
    daily(request, response) {
      response.json(service.getDailyClose(request.validatedQuery.date));
    },
    close(request, response) {
      response.status(201).json(service.close(request.validatedBody, request.auth.user.id));
    },
    reopen(request, response) {
      response.json(service.reopen(request.validatedBody, request.auth.user.id));
    },
  };
}
