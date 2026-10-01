// @ts-check
// Classic (non-module) script loaded in <head>: sets data-theme before first paint
// so there is no flash of the wrong theme. Keep in sync with js/core/theme.js.
(function () {
  let theme = null;
  try {
    theme = JSON.parse(window.localStorage.getItem('library:theme') || 'null');
  } catch {
    theme = null;
  }
  if (theme !== 'light' && theme !== 'dark') {
    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
