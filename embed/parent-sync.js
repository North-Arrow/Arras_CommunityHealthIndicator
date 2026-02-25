/**
 * Parent-page script for iframe URL sync. Add after the iframe tag on the page that embeds
 * the Community Health Indicator app. Keeps the parent URL in sync with the iframe (route,
 * theme query, map hash) via postMessage.
 *
 * Message contract: see embed/README.md and src/utils/embedMessages.ts.
 */
(function () {
  'use strict';

  var HEALTH_INDICATOR_URL_UPDATE = 'HEALTH_INDICATOR_URL_UPDATE';
  var HEALTH_INDICATOR_NAVIGATE = 'HEALTH_INDICATOR_NAVIGATE';

  /**
   * @param {{
   *   appOrigin: string;
   *   iframeSelector?: string;
   *   iframeId?: string;
   *   usePushState?: boolean;
   *   allowedIframeOrigin?: string;
   * }} options
   */
  function initHealthIndicatorEmbed(options) {
    var appOrigin = options.appOrigin;
    var iframeSelector = options.iframeSelector || 'iframe[data-health-indicator-embed]';
    var iframeId = options.iframeId;
    var usePushState = options.usePushState === true;
    var allowedIframeOrigin = options.allowedIframeOrigin || '*';

    var iframe = iframeId
      ? document.getElementById(iframeId)
      : document.querySelector(iframeSelector);
    if (!iframe) return;

    // On load: set iframe src from parent URL so the app loads with the same path, query, and hash.
    var pathname = window.location.pathname;
    var search = window.location.search || '';
    var hash = window.location.hash || '';
    var iframeSrc = appOrigin.replace(/\/$/, '') + pathname + search + hash;
    iframe.src = iframeSrc;

    window.addEventListener('message', function (event) {
      if (allowedIframeOrigin !== '*' && event.origin !== allowedIframeOrigin) return;
      var data = event.data;
      if (!data || data.type !== HEALTH_INDICATOR_URL_UPDATE) return;
      var pathname = data.pathname;
      var search = typeof data.search === 'string' ? data.search : '';
      var hash = typeof data.hash === 'string' ? data.hash : '';
      var url = pathname + search + hash;
      if (usePushState) {
        window.history.pushState(null, '', url);
      } else {
        window.history.replaceState(null, '', url);
      }
    });

    // Optional: when parent URL changes (e.g. back/forward), tell iframe to navigate.
    window.addEventListener('popstate', function () {
      var pathname = window.location.pathname;
      var search = window.location.search || '';
      var hash = window.location.hash || '';
      try {
        iframe.contentWindow.postMessage(
          {
            type: HEALTH_INDICATOR_NAVIGATE,
            pathname: pathname,
            search: search,
            hash: hash,
          },
          appOrigin
        );
      } catch (e) {
        // Cross-origin or iframe not ready
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.initHealthIndicatorEmbed = initHealthIndicatorEmbed;
  }
})();
