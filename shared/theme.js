// Sets data-theme before first paint. Follows the device setting; ?theme=dark|light overrides it.
(function () {
  var forced = new URLSearchParams(location.search).get('theme');
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    var theme = forced === 'dark' || forced === 'light' ? forced : (media.matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  }
  apply();
  media.addEventListener('change', apply);
})();
