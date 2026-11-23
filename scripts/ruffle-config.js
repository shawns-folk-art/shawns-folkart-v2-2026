(() => {
  const script = document.currentScript;
  const urlRewriteRules = [];

  if (script.hasAttribute("data-rewrite-navigation")) {
    urlRewriteRules.push([
      /^https?:\/\/(?:www\.)?touchwooddesign\.com\/common\/(nav2?\.swf)$/i,
      new URL("../common/", script.src).href + "$1",
    ]);
  }

  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = {
    autoplay: "on",
    splashScreen: false,
    unmuteOverlay: "hidden",
    urlRewriteRules,
  };
})();
