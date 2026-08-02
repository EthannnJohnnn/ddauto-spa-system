export function createPeriodCloseController(service) {
  return {
    preview(request, response) {
      response.json(service.preview(request.validatedQuery));
    },
    history(_request, response) {
      response.json(service.history());
    },
    pay(request, response) {
      response.status(201).json(service.pay(request.validatedBody, request.auth.user.id));
    },
    voidPayment(request, response) {
      response.json(
        service.void(
          request.validatedParams.id,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },
  };
}
