(function () {
  "use strict";

  var script = document.currentScript;
  var ORIGIN = script && script.src ? new URL(script.src).origin : "http://localhost:3000";
  var LOAD_TIMEOUT_MS = 15000;
  var SELECTOR = "#daisy-booking[data-studio], .daisy-booking[data-studio]";

  // Styles inline !important : seul moyen de battre le CSS agressif de l'hôte
  var IFRAME_STYLE = [
    "display:block !important",
    "width:100% !important",
    "max-width:100% !important",
    "min-width:0 !important",
    "height:520px !important",
    "border:0 !important",
    "margin:0 !important",
    "padding:0 !important",
    "box-shadow:none !important",
    "background:transparent !important",
    "color-scheme:light",
  ].join(";");

  function fallback(el, key) {
    el.innerHTML = "";
    var link = document.createElement("a");
    link.href = ORIGIN + "/embed/" + encodeURIComponent(key);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Réserver en ligne";
    el.appendChild(link);
  }

  function mount(el) {
    if (el.getAttribute("data-daisy-mounted")) return;
    var key = el.getAttribute("data-studio");
    if (!key) {
      console.error("[Daisy] Attribut data-studio manquant sur", el);
      return;
    }
    el.setAttribute("data-daisy-mounted", "1");

    var iframe = document.createElement("iframe");
    iframe.src =
      ORIGIN + "/embed/" + encodeURIComponent(key) + "?host=" + encodeURIComponent(location.origin);
    iframe.title = "Réserver un cours";
    iframe.setAttribute("style", IFRAME_STYLE);

    var ready = false;
    var timer = setTimeout(function () {
      if (!ready) {
        console.warn("[Daisy] Le widget n'a pas répondu, affichage du lien de secours.");
        fallback(el, key);
      }
    }, LOAD_TIMEOUT_MS);

    window.addEventListener("message", function (e) {
      // N'écoute que SON iframe, venant de NOTRE domaine (plusieurs widgets possibles)
      if (e.origin !== ORIGIN || e.source !== iframe.contentWindow) return;
      var data = e.data || {};
      if (data.type === "daisy:ready") {
        ready = true;
        clearTimeout(timer);
      }
      if (data.type === "daisy:resize" && typeof data.height === "number") {
        iframe.style.setProperty("height", Math.ceil(data.height) + "px", "important");
      }
    });

    el.innerHTML = "";
    el.appendChild(iframe);
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach(mount);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Wix et Squarespace injectent parfois le conteneur après le chargement
  new MutationObserver(init).observe(document.documentElement, { childList: true, subtree: true });
})();