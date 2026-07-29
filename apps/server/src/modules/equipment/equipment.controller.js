export function createEquipmentController(service) {
  return {
    overview: (request, response) => response.json(service.getOverview(request.validatedQuery)),
    createCategory: (request, response) =>
      response
        .status(201)
        .json(service.createCategory(request.validatedBody, request.auth.user.id)),
    updateCategory: (request, response) =>
      response.json(
        service.updateCategory(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      ),
    archiveCategory: (request, response) =>
      response.json(
        service.setCategoryActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      ),
    restoreCategory: (request, response) =>
      response.json(
        service.setCategoryActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      ),
    createBatch: (request, response) =>
      response.status(201).json(service.createBatch(request.validatedBody, request.auth.user.id)),
    updateBatch: (request, response) =>
      response.json(
        service.updateBatch(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      ),
    updateItem: (request, response) =>
      response.json(
        service.updateItem(request.validatedParams.id, request.validatedBody, request.auth.user.id),
      ),
    archiveItem: (request, response) =>
      response.json(
        service.setItemActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      ),
    restoreItem: (request, response) =>
      response.json(
        service.setItemActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      ),
    createRepair: (request, response) =>
      response
        .status(201)
        .json(
          service.createRepair(
            request.validatedParams.id,
            request.validatedBody,
            request.auth.user.id,
          ),
        ),
    updateRepair: (request, response) =>
      response.json(
        service.updateRepair(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      ),
    voidRepair: (request, response) =>
      response.json(
        service.setRepairActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      ),
    restoreRepair: (request, response) =>
      response.json(
        service.setRepairActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      ),
  };
}
