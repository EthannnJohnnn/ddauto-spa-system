export function createServiceSalesController(service) {
  return {
    daily(request, response) {
      response.json(service.getDailySales(request.validatedQuery.date));
    },

    createTicket(request, response) {
      response.status(201).json(service.createTicket(request.validatedBody, request.auth.user.id));
    },

    updateTicket(request, response) {
      response.json(
        service.updateTicket(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      );
    },

    voidTicket(request, response) {
      response.json(
        service.setTicketStatus(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    restoreTicket(request, response) {
      response.json(
        service.setTicketStatus(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    attendance(request, response) {
      response.json(service.setAttendance(request.validatedBody, request.auth.user.id));
    },
  };
}
