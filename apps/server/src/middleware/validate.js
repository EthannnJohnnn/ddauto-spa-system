import { AppError } from '../errors/app-error.js';

export function validateBody(schema) {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);

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

    request.validatedBody = result.data;
    next();
  };
}
