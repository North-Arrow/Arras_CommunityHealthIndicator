/**
 * PostMessage contract for parent–iframe URL sync when this app is embedded.
 * Keep in sync with embed/parent-sync.js and embed/README.md.
 */

/** Iframe → parent: notify that the app URL changed (route, theme, or map hash). */
export const HEALTH_INDICATOR_URL_UPDATE = 'HEALTH_INDICATOR_URL_UPDATE';

/** Parent → iframe: instruct the app to navigate to the given pathname, search, and hash. */
export const HEALTH_INDICATOR_NAVIGATE = 'HEALTH_INDICATOR_NAVIGATE';

export interface UrlUpdatePayload {
  type: typeof HEALTH_INDICATOR_URL_UPDATE;
  pathname: string;
  search: string;
  hash: string;
}

export interface NavigatePayload {
  type: typeof HEALTH_INDICATOR_NAVIGATE;
  pathname: string;
  search: string;
  hash?: string;
}

export function buildUrlUpdatePayload(
  pathname: string,
  search: string,
  hash: string
): UrlUpdatePayload {
  return {
    type: HEALTH_INDICATOR_URL_UPDATE,
    pathname,
    search,
    hash: hash ?? '',
  };
}

export function isNavigatePayload(
  data: unknown
): data is NavigatePayload {
  if (typeof data !== 'object' || data === null) return false;
  const p = data as NavigatePayload;
  return (
    p.type === HEALTH_INDICATOR_NAVIGATE &&
    typeof p.pathname === 'string' &&
    typeof p.search === 'string' &&
    (p.hash === undefined || typeof p.hash === 'string')
  );
}
