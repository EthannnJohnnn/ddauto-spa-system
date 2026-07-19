import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validateBody } from '../../middleware/validate.js';
import { createAuthController } from './auth.controller.js';
import { createAuthMiddleware } from './auth.middleware.js';
import { loginSchema, resetPasswordSchema, setupSchema } from './auth.schemas.js';

export function createAuthModule(authService, options) {
  const router = Router();
  const controller = createAuthController(authService, options);
  const middleware = createAuthMiddleware(authService, options);
  const authRateLimit = options.enableRateLimit
    ? rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 10,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        handler(request, response) {
          response.status(429).json({
            error: {
              code: 'TOO_MANY_AUTH_ATTEMPTS',
              message: 'Too many attempts. Please wait 15 minutes and try again.',
            },
          });
        },
      })
    : (request, response, next) => next();

  router.get('/status', middleware.optionalAuth, controller.status);
  router.post('/setup', authRateLimit, validateBody(setupSchema), controller.setup);
  router.post('/login', authRateLimit, validateBody(loginSchema), controller.login);
  router.post(
    '/reset-password',
    authRateLimit,
    validateBody(resetPasswordSchema),
    controller.resetPassword,
  );
  router.post(
    '/logout',
    middleware.optionalAuth,
    middleware.requireAuth,
    middleware.requireCsrf,
    controller.logout,
  );

  return { router, middleware };
}
