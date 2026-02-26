/**
 * Parent-page script for iframe URL sync. Add after the iframe tag on the page that embeds
 * the Community Health Indicator app. Keeps the parent URL in sync with the iframe (route,
 * theme query, map hash) via postMessage.
 *
 * When pathPrefix is set, app state is stored in the parent's query string (?path=/map&theme=...)
 * so the parent path never changes (stays e.g. /embed-test/). The server only needs to serve
 * the embed page at that path; no need to handle /embed-test/map etc.
 *
 * Message contract: see embed-test/README.md and src/utils/embedMessages.ts.
 */
(function () {
  'use strict';

  var HEALTH_INDICATOR_URL_UPDATE = 'HEALTH_INDICATOR_URL_UPDATE';
  var HEALTH_INDICATOR_NAVIGATE = 'HEALTH_INDICATOR_NAVIGATE';

  function parseQuery(str) {
    var params = {};
    if (!str || str.charAt(0) !== '?') return params;
    str.slice(1).split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i === -1) return;
      params[decodeURIComponent(pair.slice(0, i))] = decodeURIComponent(pair.slice(i + 1));
    });
    return params;
  }

  function getThemeFromSearch(search) {
    var q = parseQuery(search);
    return q.theme || '';
  }

  /**
   * Build parent URL when using query-param mode: pathPrefix + ?path=...&theme=... + hash.
   * When app is at root (pathname === '/' and no theme), return pathPrefix only so the query string is removed.
   */
  function buildParentUrlWithQuery(pathPrefixNorm, pathname, search, hash) {
    var theme = getThemeFromSearch(search);
    var atRoot = pathname === '/' || pathname === '';
    if (atRoot && !theme) {
      return pathPrefixNorm + '/';
    }
    var q = 'path=' + encodeURIComponent(pathname || '/');
    if (theme) q += '&theme=' + encodeURIComponent(theme);
    return pathPrefixNorm + '?' + q + (hash || '');
  }

  /**
   * Read app path and theme from parent's query string. Hash is taken from parent's hash.
   */
  function readAppStateFromParent(pathPrefix) {
    var pathname = window.location.pathname;
    var search = window.location.search || '';
    var hash = window.location.hash || '';
    var pathPrefixNorm = pathPrefix ? pathPrefix.replace(/\/$/, '') : '';
    var appPath = '/';
    var appSearch = '';
    if (pathPrefixNorm && (pathname === pathPrefixNorm || pathname.indexOf(pathPrefixNorm + '/') === 0)) {
      var q = parseQuery(search);
      appPath = (q.path && q.path.charAt(0) === '/') ? q.path : '/' + (q.path || '');
      if (q.theme) appSearch = '?theme=' + encodeURIComponent(q.theme);
    } else if (!pathPrefix) {
      appPath = pathname || '/';
      appSearch = search;
    }
    return { appPath: appPath, appSearch: appSearch, hash: hash };
  }

  /**
   * @param {{
   *   appOrigin: string;
   *   pathPrefix?: string;
   *   pathInQuery?: boolean;
   *   iframeSelector?: string;
   *   iframeId?: string;
   *   usePushState?: boolean;
   *   allowedIframeOrigin?: string;
   * }} options
   * pathInQuery: when pathPrefix is set, if true (default) store app path/theme in parent query
   *   so parent URL stays pathPrefix + ?path=/map&theme=... (no server config needed).
   *   If false, parent URL becomes pathPrefix + /map?theme=... (requires server to serve embed for all pathPrefix/*).
   */
  function initHealthIndicatorEmbed(options) {
    var appOrigin = options.appOrigin;
    var pathPrefix = options.pathPrefix || '';
    var pathInQuery = options.pathInQuery !== false;
    var iframeSelector = options.iframeSelector || 'iframe[data-health-indicator-embed]';
    var iframeId = options.iframeId;
    var usePushState = options.usePushState === true;
    var allowedIframeOrigin = options.allowedIframeOrigin || '*';

    var pathPrefixNorm = pathPrefix ? pathPrefix.replace(/\/$/, '') : '';
    var useQueryMode = pathPrefixNorm && pathInQuery;

    var iframe = iframeId
      ? document.getElementById(iframeId)
      : document.querySelector(iframeSelector);
    if (!iframe) return;

    // On load: build iframe src from parent URL.
    var pathname = window.location.pathname;
    var search = window.location.search || '';
    var hash = window.location.hash || '';
    var appPath, appSearch;
    if (useQueryMode) {
      var state = readAppStateFromParent(pathPrefix);
      appPath = state.appPath;
      appSearch = state.appSearch;
    } else if (pathPrefixNorm) {
      var appPathFromPath = (pathname === pathPrefixNorm || pathname.indexOf(pathPrefixNorm + '/') === 0)
        ? (pathname.slice(pathPrefixNorm.length) || '/')
        : pathname;
      appPath = appPathFromPath.startsWith('/') ? appPathFromPath : '/' + appPathFromPath;
      appSearch = search;
    } else {
      appPath = pathname || '/';
      appSearch = search;
    }
    var iframeSrc = appOrigin.replace(/\/$/, '') + appPath + appSearch + hash;
    iframe.src = iframeSrc;

    var allowedOriginNorm = allowedIframeOrigin !== '*' ? allowedIframeOrigin.replace(/\/$/, '') : '*';
    window.addEventListener('message', function (event) {
      if (allowedOriginNorm !== '*' && event.origin && event.origin.replace(/\/$/, '') !== allowedOriginNorm) return;
      var data = event.data;
      if (!data || data.type !== HEALTH_INDICATOR_URL_UPDATE) return;
      var pathname = data.pathname;
      var search = typeof data.search === 'string' ? data.search : '';
      var hash = typeof data.hash === 'string' ? data.hash : '';
      var url;
      if (useQueryMode) {
        url = buildParentUrlWithQuery(pathPrefixNorm, pathname, search, hash);
      } else {
        var parentPath = pathPrefixNorm ? pathPrefixNorm + pathname : pathname;
        url = parentPath + search + hash;
      }
      if (usePushState) {
        window.history.pushState(null, '', url);
      } else {
        window.history.replaceState(null, '', url);
      }
    });

    window.addEventListener('popstate', function () {
      var state;
      if (useQueryMode) {
        state = readAppStateFromParent(pathPrefix);
      } else {
        var p = window.location.pathname;
        var appPath = (pathPrefixNorm && (p === pathPrefixNorm || p.indexOf(pathPrefixNorm + '/') === 0))
          ? (p.slice(pathPrefixNorm.length) || '/')
          : p;
        state = { appPath: appPath, appSearch: window.location.search || '', hash: window.location.hash || '' };
      }
      if (!state.appPath.startsWith('/')) state.appPath = '/' + state.appPath;
      try {
        iframe.contentWindow.postMessage(
          {
            type: HEALTH_INDICATOR_NAVIGATE,
            pathname: state.appPath,
            search: state.appSearch,
            hash: state.hash,
          },
          appOrigin
        );
      } catch (e) {
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.initHealthIndicatorEmbed = initHealthIndicatorEmbed;
  }
})();
