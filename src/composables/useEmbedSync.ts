import { type Router } from 'vue-router';
import {
  buildUrlUpdatePayload,
  isNavigatePayload,
} from '../utils/embedMessages';

/** Use '*' in dev or set to parent origin for production. */
const DEFAULT_TARGET_ORIGIN = '*';

export function isInIframe(): boolean {
  return typeof window !== 'undefined' && window !== window.top;
}

function getCurrentUrlState(): { pathname: string; search: string; hash: string } {
  return {
    pathname: window.location.pathname,
    search: window.location.search ?? '',
    hash: window.location.hash ?? '',
  };
}

function notifyParent(
  pathname: string,
  search: string,
  hash: string,
  targetOrigin: string
): void {
  const payload = buildUrlUpdatePayload(pathname, search, hash);
  window.parent.postMessage(payload, targetOrigin);
}

/**
 * Sets up iframe ↔ parent URL sync via postMessage. Call once at app root when in iframe.
 * - Sends HEALTH_INDICATOR_URL_UPDATE on route or hash change.
 * - Listens for HEALTH_INDICATOR_NAVIGATE and applies pathname + search + hash.
 */
export function useEmbedSync(
  router: Router,
  options: { targetOrigin?: string } = {}
): void {
  if (!isInIframe()) return;

  const targetOrigin = options.targetOrigin ?? DEFAULT_TARGET_ORIGIN;

  const sendUrlToParent = () => {
    const { pathname, search, hash } = getCurrentUrlState();
    notifyParent(pathname, search, hash, targetOrigin);
  };

  // Send URL to parent when Vue route changes (path or query, e.g. theme).
  router.afterEach(() => {
    sendUrlToParent();
  });

  // Send URL to parent when hash changes (map pan/zoom via MapLibre).
  window.addEventListener('hashchange', sendUrlToParent);

  // Apply parent-sent navigation (e.g. back/forward on parent).
  const handleMessage = (event: MessageEvent) => {
    if (!isNavigatePayload(event.data)) return;
    const { pathname, search, hash } = event.data;
    const fullPath = pathname + search;
    router.replace(fullPath).then(() => {
      const newHash = hash ?? '';
      if (window.location.hash !== newHash) {
        window.location.hash = newHash;
      }
    });
  };

  window.addEventListener('message', handleMessage);
}
