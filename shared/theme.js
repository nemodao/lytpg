// Sets data-theme before first paint. Follows the device setting; ?theme=dark|light overrides it.
// PREVIEW ONLY: ?premium=1 sets data-premium (the gold brand). API: the app sends `isPremium` through initWebview.
(function () {
  var params = new URLSearchParams(location.search);
  var forced = params.get('theme');
  if (params.get('premium') === '1') document.documentElement.setAttribute('data-premium', '');
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    var theme = forced === 'dark' || forced === 'light' ? forced : (media.matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }
  apply();
  media.addEventListener('change', apply);
})();
