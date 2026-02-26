# Embedding the Community Health Indicator app

This app can be embedded in an iframe and kept in sync with the parent page’s URL (route, theme query, and map hash) using `postMessage`.

## How it works

1. **Parent page** includes an iframe and the `parent-sync.js` script (after the iframe tag).
2. On load, the script sets the iframe’s `src` to your app origin plus the *app path* (pathname, search, hash). If the parent page lives in a subdirectory (e.g. `/embed-test/`), set `pathPrefix` so the script strips it and uses the app’s routes (e.g. `/map`) for the iframe, not the parent path.
3. When the user changes theme or moves the map inside the iframe, the app sends a message to the parent; the parent updates its own URL with `history.replaceState` (or `pushState` if configured).
4. When the user uses the browser back/forward on the parent, the parent sends a message to the iframe so the app navigates to the new URL.

## Parent page setup

1. Add the iframe (with `src="about:blank"` or any placeholder; the script will set the real URL).

2. Include the parent script after the iframe:

   ```html
   <iframe id="health-indicator-iframe" data-health-indicator-embed title="Community Health Indicator" src="about:blank"></iframe>
   <script src="path/to/parent-sync.js"></script>
   <script>
     window.initHealthIndicatorEmbed({
       appOrigin: 'https://your-app-origin.com',
       pathPrefix: '/embed-test',
       iframeSelector: 'iframe[data-health-indicator-embed]',
       usePushState: false,
       allowedIframeOrigin: 'https://your-app-origin.com'
     });
   </script>
   ```

3. When the parent page is in a subdirectory (e.g. `https://yoursite.com/embed-test/`), set `pathPrefix: '/embed-test'`. The script strips that prefix from the parent pathname to get the app path (e.g. `/embed-test/map` → `/map`), so the iframe loads the app at `/map`, not `/embed-test/map`. When the iframe reports URL changes, the parent URL is updated *with* the prefix (e.g. `/embed-test/map?theme=...`).

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appOrigin` | string | (required) | Origin of the deployed app (e.g. `https://example.com`). No trailing slash. |
| `pathPrefix` | string | `''` | Parent page subdirectory to strip from pathname (e.g. `'/embed-test'`). The iframe gets app paths like `/map`; the parent URL stays under this prefix (e.g. `/embed-test/map?theme=...`). |
| `iframeSelector` | string | `'iframe[data-health-indicator-embed]'` | CSS selector for the iframe. |
| `iframeId` | string | — | If set, used instead of `iframeSelector` to find the iframe by ID. |
| `usePushState` | boolean | `false` | If `true`, use `history.pushState` on URL updates so each change creates a history entry; if `false`, use `replaceState`. |
| `allowedIframeOrigin` | string | `'*'` | Allowed `event.origin` for incoming messages. Prefer your app origin in production. |

## Message contract

Both sides must use the same message types and payload shape. Defined in `src/utils/embedMessages.ts` and in this README.

### Iframe → parent: URL update

When the app’s URL changes (route, query, or hash), it sends:

- **Type:** `HEALTH_INDICATOR_URL_UPDATE`
- **Payload:** `{ type, pathname, search, hash }` (all strings; `search` includes `?`, `hash` includes `#`).

The parent should update its URL to `pathPrefix + pathname + search + hash` (e.g. via `history.replaceState` or `pushState`) so the parent stays under its subdirectory.

### Parent → iframe: navigate

When the parent URL changes (e.g. back/forward), the parent sends:

- **Type:** `HEALTH_INDICATOR_NAVIGATE`
- **Payload:** `{ type, pathname, search, hash }` (same semantics; `hash` optional).

The iframe app will call `router.replace(pathname + search)` and set `window.location.hash` to `hash`.

## Security

- **Origin checks:** The parent script should set `allowedIframeOrigin` to the app’s origin (e.g. `https://your-app.com`) so only messages from that iframe are accepted. The iframe app can pass a `targetOrigin` when calling `postMessage` (see `useEmbedSync` in `src/composables/useEmbedSync.ts`); use a specific parent origin in production instead of `'*'`.

## Example

See `index.html` in this folder for a minimal parent page. When the parent is at `https://yoursite.com/embed-test/`, set `pathPrefix: '/embed-test'` so the iframe loads the app at `/` (landing). When the user opens the map in the iframe, the parent URL becomes `https://yoursite.com/embed-test/map?theme=...` and the iframe continues to use app paths (`/map`, etc.).
