export function createReportsController(service) {
  return {
    overview(request, response) {
      response.json(service.getOverview(request.validatedQuery));
    },
  };
}
