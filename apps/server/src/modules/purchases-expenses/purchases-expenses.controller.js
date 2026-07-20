export function createPurchasesExpensesController(service) {
  return {
    overview(request, response) {
      response.json(service.getOverview(request.validatedQuery));
    },

    createCategory(request, response) {
      response
        .status(201)
        .json(service.createCategory(request.validatedBody, request.auth.user.id));
    },

    updateCategory(request, response) {
      response.json(
        service.updateCategory(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      );
    },

    archiveCategory(request, response) {
      response.json(
        service.setCategoryActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    restoreCategory(request, response) {
      response.json(
        service.setCategoryActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    createExpense(request, response) {
      response.status(201).json(service.createExpense(request.validatedBody, request.auth.user.id));
    },

    updateExpense(request, response) {
      response.json(
        service.updateExpense(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      );
    },

    voidExpense(request, response) {
      response.json(
        service.setExpenseActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    restoreExpense(request, response) {
      response.json(
        service.setExpenseActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },
  };
}
