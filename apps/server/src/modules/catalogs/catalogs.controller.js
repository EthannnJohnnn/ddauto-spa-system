export function createCatalogsController(service) {
  return {
    list(request, response) {
      response.json(service.listCatalogs());
    },

    createEmployee(request, response) {
      response
        .status(201)
        .json(service.createEmployee(request.validatedBody, request.auth.user.id));
    },

    updateEmployee(request, response) {
      response.json(
        service.updateEmployee(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      );
    },

    archiveEmployee(request, response) {
      response.json(
        service.setEmployeeActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    restoreEmployee(request, response) {
      response.json(
        service.setEmployeeActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    createVehicleClass(request, response) {
      response
        .status(201)
        .json(service.createVehicleClass(request.validatedBody, request.auth.user.id));
    },

    updateVehicleClass(request, response) {
      response.json(
        service.updateVehicleClass(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      );
    },

    archiveVehicleClass(request, response) {
      response.json(
        service.setVehicleClassActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    restoreVehicleClass(request, response) {
      response.json(
        service.setVehicleClassActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    createService(request, response) {
      response.status(201).json(service.createService(request.validatedBody, request.auth.user.id));
    },

    updateService(request, response) {
      response.json(
        service.updateService(
          request.validatedParams.id,
          request.validatedBody,
          request.auth.user.id,
        ),
      );
    },

    archiveService(request, response) {
      response.json(
        service.setServiceActive(
          request.validatedParams.id,
          false,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    restoreService(request, response) {
      response.json(
        service.setServiceActive(
          request.validatedParams.id,
          true,
          request.validatedBody.reason,
          request.auth.user.id,
        ),
      );
    },

    setServicePrice(request, response) {
      response.json(service.setServicePrice(request.validatedBody, request.auth.user.id));
    },
  };
}
