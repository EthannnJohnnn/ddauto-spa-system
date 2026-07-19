import { SESSION_COOKIE_NAME, SESSION_IDLE_DURATION_MS } from './auth.constants.js';

function cookieOptions(secure) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
  };
}

export function setSessionCookie(response, sessionToken, secure) {
  response.cookie(SESSION_COOKIE_NAME, sessionToken, {
    ...cookieOptions(secure),
    maxAge: SESSION_IDLE_DURATION_MS,
  });
}

export function clearSessionCookie(response, secure) {
  response.clearCookie(SESSION_COOKIE_NAME, cookieOptions(secure));
}
