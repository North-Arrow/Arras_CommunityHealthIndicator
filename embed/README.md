# Embedding the Community Health Indicator app

This app can be embedded in an iframe and kept in sync with the parent page’s URL (route, theme query, and map hash) using `postMessage`.

## How it works

1. **Parent page** includes an iframe and the `parent-sync.js` script (after the iframe tag).
2. On load, the script sets the iframe’s `src` to your app origin plus the parent’s current `pathname`, `search`, and `hash`, so the app loads with the correct route, theme (`?theme=...`), and map position (hash: `zoom/lat/lng`).
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
       iframeSelector: 'iframe[data-health-indicator-embed]',
       usePushState: false,
       allowedIframeOrigin: 'https://your-app-origin.com'
     });
   </script>
   ```

3. Your parent page URL should mirror the app’s routes when you want to show the map, e.g. `/map?theme=social_cultural` and optionally a hash for map position (e.g. `#8.57/34.65/-80.17`). The script builds the iframe URL as `appOrigin + pathname + search + hash`.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appOrigin` | string | (required) | Origin of the deployed app (e.g. `https://example.com`). No trailing slash. |
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

The parent should update its URL to `pathname + search + hash` (e.g. via `history.replaceState` or `pushState`).

### Parent → iframe: navigate

When the parent URL changes (e.g. back/forward), the parent sends:

- **Type:** `HEALTH_INDICATOR_NAVIGATE`
- **Payload:** `{ type, pathname, search, hash }` (same semantics; `hash` optional).

The iframe app will call `router.replace(pathname + search)` and set `window.location.hash` to `hash`.

## Security

- **Origin checks:** The parent script should set `allowedIframeOrigin` to the app’s origin (e.g. `https://your-app.com`) so only messages from that iframe are accepted. The iframe app can pass a `targetOrigin` when calling `postMessage` (see `useEmbedSync` in `src/composables/useEmbedSync.ts`); use a specific parent origin in production instead of `'*'`.

## Example

See `embed/example.html` for a minimal parent page that loads the script and configures the embed. For local testing, run the app (e.g. `npm run dev`) and open the example from a page whose URL includes the map route and theme, e.g. `http://localhost:3000/map?theme=social_cultural`, or adjust the example so the parent’s initial URL matches that structure.
