export function createTireInventoryController(service) {
  return {
    overview(request, response) {
      response.json(service.getOverview(request.validatedQuery));
    },

    createProduct(request, response) {
      response.status(201).json(service.createProduct(request.validatedBody, request.auth.user.id));
    },

    updateProduct(request, response) {
      response.json(
        service.updateProduct(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      );
    },

    archiveProduct(request, response) {
      response.json(
        service.setProductActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    restoreProduct(request, response) {
      response.json(
        service.setProductActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    createDocument(request, response) {
      response
        .status(201)
        .json(service.createDocument(request.validatedBody, request.auth.user.id));
    },

    updateDocument(request, response) {
      response.json(
        service.updateDocument(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      );
    },

    voidDocument(request, response) {
      response.json(
        service.setDocumentActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    restoreDocument(request, response) {
      response.json(
        service.setDocumentActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },
  };
}
