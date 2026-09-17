import type { CookieOptions, Request, Response } from 'express';
import { API_PREFIX } from '../configure-app';

export const REFRESH_COOKIE_NAME = 'refresh_token';

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  // JavaScript on the page can't read it, so an XSS bug can't steal the refresh token.
  httpOnly: true,
  // Only ever sent over HTTPS. Browsers treat http://localhost as secure, so dev still works.
  secure: true,
  // Never sent on requests started by another site, which blocks CSRF on refresh/logout.
  sameSite: 'strict',
  // Only sent to the auth routes, not attached to every API call.
  path: `/${API_PREFIX}/auth`,
};

export function setRefreshCookie(response: Response, token: string, expiresAt: Date): void {
  response.cookie(REFRESH_COOKIE_NAME, token, { ...REFRESH_COOKIE_OPTIONS, expires: expiresAt });
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
}

export function readRefreshCookie(request: Request): string | null {
  // cookie-parser types cookies as `any`; treat the value as unknown until checked.
  const value: unknown = (request.cookies as Record<string, unknown>)[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
