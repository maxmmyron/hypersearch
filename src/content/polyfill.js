/**
 * This file is a polyfill for the browser object. It is used to make the
 * extension compatible with both Firefox and Chrome.
 */
window.browser = (function () {
  return window.msBrowser ||
    window.browser ||
    window.chrome;
})();
