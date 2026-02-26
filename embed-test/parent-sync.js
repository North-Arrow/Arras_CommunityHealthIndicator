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
   * Strips pathPrefix from pathname to get the app path. Ensures result starts with /.
   * @param {string} pathname - Parent page pathname (e.g. /embed-test/map)
   * @param {string} pathPrefix - Prefix to strip (e.g. /embed-test)
   * @returns {string} App path (e.g. /map or /)
   */
  function toAppPath(pathname, pathPrefix) {
    if (!pathPrefix) return pathname;
    var prefix = pathPrefix.replace(/\/$/, '');
    if (!prefix) return pathname;
    if (pathname === prefix || pathname.indexOf(prefix + '/') === 0) {
      var appPath = pathname.slice(prefix.length) || '/';
      return appPath.startsWith('/') ? appPath : '/' + appPath;
    }
    return pathname;
  }

  /**
   * @param {{
   *   appOrigin: string;
   *   pathPrefix?: string;
   *   iframeSelector?: string;
   *   iframeId?: string;
   *   usePushState?: boolean;
   *   allowedIframeOrigin?: string;
   * }} options
   */
  function initHealthIndicatorEmbed(options) {
    var appOrigin = options.appOrigin;
    var pathPrefix = options.pathPrefix || '';
    var iframeSelector = options.iframeSelector || 'iframe[data-health-indicator-embed]';
    var iframeId = options.iframeId;
    var usePushState = options.usePushState === true;
    var allowedIframeOrigin = options.allowedIframeOrigin || '*';

    var iframe = iframeId
      ? document.getElementById(iframeId)
      : document.querySelector(iframeSelector);
    if (!iframe) return;

    // On load: build app path from parent URL (strip pathPrefix so iframe gets /map not /embed-test/map).
    var pathname = window.location.pathname;
    var search = window.location.search || '';
    var hash = window.location.hash || '';
    var appPath = toAppPath(pathname, pathPrefix);
    var iframeSrc = appOrigin.replace(/\/$/, '') + appPath + search + hash;
    iframe.src = iframeSrc;

    window.addEventListener('message', function (event) {
      if (allowedIframeOrigin !== '*' && event.origin !== allowedIframeOrigin) return;
      var data = event.data;
      if (!data || data.type !== HEALTH_INDICATOR_URL_UPDATE) return;
      var pathname = data.pathname;
      var search = typeof data.search === 'string' ? data.search : '';
      var hash = typeof data.hash === 'string' ? data.hash : '';
      // Keep parent URL under pathPrefix (e.g. /embed-test/map?theme=x#hash).
      var parentPath = pathPrefix ? (pathPrefix.replace(/\/$/, '') + pathname) : pathname;
      var url = parentPath + search + hash;
      if (usePushState) {
        window.history.pushState(null, '', url);
      } else {
        window.history.replaceState(null, '', url);
      }
    });

    // Optional: when parent URL changes (e.g. back/forward), tell iframe to navigate (send app path, not parent path).
    window.addEventListener('popstate', function () {
      var pathname = window.location.pathname;
      var search = window.location.search || '';
      var hash = window.location.hash || '';
      var appPath = toAppPath(pathname, pathPrefix);
      try {
        iframe.contentWindow.postMessage(
          {
            type: HEALTH_INDICATOR_NAVIGATE,
            pathname: appPath,
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
