import { AppError } from '../../errors/app-error.js';
import { safeEqualText } from './auth.crypto.js';
import { SESSION_COOKIE_NAME } from './auth.constants.js';
import { clearSessionCookie, setSessionCookie } from './session-cookie.js';

export function createAuthMiddleware(authService, { secureCookies }) {
  const optionalAuth = async (request, response, next) => {
    const sessionToken = request.cookies[SESSION_COOKIE_NAME];
    const auth = authService.getSession(sessionToken);

    if (auth) {
      request.auth = auth;
      request.sessionToken = sessionToken;
      setSessionCookie(response, sessionToken, secureCookies);
    } else if (sessionToken) {
      clearSessionCookie(response, secureCookies);
    }

    next();
  };

  const requireAuth = (request, response, next) => {
    if (!request.auth) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in to continue.'));
      return;
    }

    next();
  };

  const requireOwner = (request, response, next) => {
    if (request.auth?.user.role !== 'OWNER') {
      next(new AppError(403, 'OWNER_REQUIRED', 'Owner authorization is required.'));
      return;
    }

    next();
  };

  const requireCsrf = (request, response, next) => {
    const providedToken = request.get('x-csrf-token') ?? '';
    const expectedToken = request.auth?.csrfToken ?? '';

    if (!providedToken || !safeEqualText(providedToken, expectedToken)) {
      next(new AppError(403, 'INVALID_CSRF_TOKEN', 'The security token is invalid.'));
      return;
    }

    next();
  };

  return { optionalAuth, requireAuth, requireOwner, requireCsrf };
}
