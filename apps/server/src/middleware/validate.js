import { AppError } from '../errors/app-error.js';

export function validateBody(schema) {
  return validateSource(schema, 'body', 'validatedBody');
}

export function validateParams(schema) {
  return validateSource(schema, 'params', 'validatedParams');
}

export function validateQuery(schema) {
  return validateSource(schema, 'query', 'validatedQuery');
}

function validateSource(schema, source, destination) {
  return (request, response, next) => {
    const result = schema.safeParse(request[source]);

    if (!result.success) {
      next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Please correct the highlighted information.',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
      );
      return;
    }

    request[destination] = result.data;
    next();
  };
}
