# Embedding the Community Health Indicator app

This app can be embedded in an iframe and kept in sync with the parent page’s URL (route, theme query, and map hash) using `postMessage`.

## How it works

1. **Parent page** includes an iframe and the `parent-sync.js` script (after the iframe tag).
2. On load, the script sets the iframe’s `src` to your app origin plus the app path, theme, and map hash. If the parent page lives in a subdirectory (e.g. `/embed-test/`), set `pathPrefix`. By default the app route and theme are stored in the *parent’s query string* (`?path=/map&theme=...`) so the parent path never changes—the server only needs to serve the embed page at `/embed-test/`, not `/embed-test/map`.
3. When the user changes theme or moves the map inside the iframe, the app sends a message to the parent; the parent updates its own URL (query and hash only when using query mode).
4. When the user uses the browser back/forward on the parent, the parent sends a message to the iframe so the app navigates to the new state.

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

3. When the parent page is in a subdirectory (e.g. `https://yoursite.com/embed-test/`), set `pathPrefix: '/embed-test'`. By default (`pathInQuery: true`) the app route and theme are stored in the parent’s query string, so the parent URL stays `https://yoursite.com/embed-test/?path=/map&theme=social_cultural#8/34/-80`. The server never receives a request for `/embed-test/map`—only for `/embed-test/`. Set `pathInQuery: false` if you prefer path-based parent URLs (e.g. `/embed-test/map?theme=...`); then your server must be configured to serve the same embed page for all paths under `pathPrefix`.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appOrigin` | string | (required) | Origin of the deployed app (e.g. `https://example.com`). No trailing slash. |
| `pathPrefix` | string | `''` | Parent page subdirectory (e.g. `'/embed-test'`). When set, the iframe gets app paths like `/map`; see `pathInQuery`. |
| `pathInQuery` | boolean | `true` | When `pathPrefix` is set: if `true`, store app path and theme in the parent’s query string (`/embed-test/?path=/map&theme=...`), so the server only serves the embed at `/embed-test/`. If `false`, parent URL becomes `/embed-test/map?theme=...` (requires server to serve the embed page for all `pathPrefix/*`). |
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

The parent updates its URL accordingly: in query mode it uses `pathPrefix + '?' + path=...&theme=...` + hash; otherwise `pathPrefix + pathname + search + hash`.

### Parent → iframe: navigate

When the parent URL changes (e.g. back/forward), the parent sends:

- **Type:** `HEALTH_INDICATOR_NAVIGATE`
- **Payload:** `{ type, pathname, search, hash }` (same semantics; `hash` optional).

The iframe app will call `router.replace(pathname + search)` and set `window.location.hash` to `hash`.

## Security

- **Origin checks:** The parent script should set `allowedIframeOrigin` to the app’s origin (e.g. `https://your-app.com`) so only messages from that iframe are accepted. The iframe app can pass a `targetOrigin` when calling `postMessage` (see `useEmbedSync` in `src/composables/useEmbedSync.ts`); use a specific parent origin in production instead of `'*'`.

## Example

See `index.html` in this folder. With `pathPrefix: '/embed-test'` and default `pathInQuery: true`, the parent URL stays at `https://yoursite.com/embed-test/` and becomes `https://yoursite.com/embed-test/?path=/map&theme=social_cultural#8/34/-80` when the user opens the map and pans/zooms. No server configuration is required beyond serving the embed page at `/embed-test/`.
