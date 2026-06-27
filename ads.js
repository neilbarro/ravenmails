/* Ravenmails — advertising loader.
   Non-intrusive by design: in-flow display units only, clearly labelled,
   and nothing renders unless an AdSense client + slot id are configured.
   Editorial firewall: ads never influence coverage (see editorial-standards.html). */
(function () {
  "use strict";
  var CFG = window.RAVENMAILS_CONFIG || {};
  var CLIENT = (CFG.ADSENSE_CLIENT || "").trim();
  var SLOTS = CFG.AD_SLOTS || {};
  var slots = document.querySelectorAll(".ad-slot");
  var configured = CLIENT.indexOf("ca-pub-") === 0;

  // Not set up yet → keep every ad slot hidden (no empty boxes, no distraction).
  if (!configured) {
    slots.forEach(function (s) { s.hidden = true; });
    return;
  }

  // Load the AdSense library once. We use manual units only — no page-level
  // auto ads — so there are no anchor or vignette (full-screen) ads.
  if (!window.__rmAdsLoaded) {
    var lib = document.createElement("script");
    lib.async = true;
    lib.crossOrigin = "anonymous";
    lib.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(CLIENT);
    document.head.appendChild(lib);
    window.__rmAdsLoaded = true;
  }

  slots.forEach(function (s) {
    var name = s.getAttribute("data-ad-name");
    var slotId = (s.getAttribute("data-ad-slot") || SLOTS[name] || "").trim();
    if (!slotId) { s.hidden = true; return; }   // unit not provided → stay hidden
    s.hidden = false;

    var box = s.querySelector(".ad-box") || s;
    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", CLIENT);
    ins.setAttribute("data-ad-slot", slotId);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    box.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  });
})();
