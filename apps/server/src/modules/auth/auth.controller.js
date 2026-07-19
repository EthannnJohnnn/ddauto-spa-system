import { clearSessionCookie, setSessionCookie } from './session-cookie.js';

export function createAuthController(authService, { secureCookies }) {
  return {
    status(request, response) {
      response.json({
        needsSetup: authService.needsSetup(),
        authenticated: Boolean(request.auth),
        user: request.auth?.user ?? null,
        csrfToken: request.auth?.csrfToken ?? null,
      });
    },

    async setup(request, response) {
      const result = await authService.setupOwner(request.validatedBody);
      setSessionCookie(response, result.sessionToken, secureCookies);
      response.status(201).json({
        user: result.user,
        csrfToken: result.csrfToken,
        recoveryCode: result.recoveryCode,
      });
    },

    async login(request, response) {
      const result = await authService.login(request.validatedBody);
      setSessionCookie(response, result.sessionToken, secureCookies);
      response.json({
        user: result.user,
        csrfToken: result.csrfToken,
      });
    },

    logout(request, response) {
      authService.logout(request.sessionToken, request.auth.user.id);
      clearSessionCookie(response, secureCookies);
      response.status(204).send();
    },

    async resetPassword(request, response) {
      const result = await authService.resetPassword(request.validatedBody);
      setSessionCookie(response, result.sessionToken, secureCookies);
      response.json({
        user: result.user,
        csrfToken: result.csrfToken,
        recoveryCode: result.recoveryCode,
      });
    },
  };
}
