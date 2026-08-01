export function createAttendanceController(service) {
  return {
    open(request, response) {
      response.json(service.getOpenAttendance(request.validatedQuery.through));
    },

    review(request, response) {
      response.json(service.review(request.validatedBody, request.auth.user.id));
    },
  };
}
