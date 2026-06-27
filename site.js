/* Ravenmails — shared site behaviour: mobile nav, theme toggle, PWA, article UX.
   Loaded on every page. Progressive enhancement only — the site works without it. */
(function () {
  "use strict";
  var doc = document;

  /* ---------- Footer year ---------- */
  function setYear() {
    doc.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------- Active nav link ---------- */
  function markActive() {
    var here = location.pathname.split("/").pop() || "index.html";
    doc.querySelectorAll(".nav-menu a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("#")[0].split("/").pop();
      if (href && href === here) a.setAttribute("aria-current", "page");
    });
  }

  /* ---------- Mobile nav ---------- */
  function initNav() {
    var toggle = doc.querySelector(".nav-toggle");
    var menu = doc.getElementById("nav-menu");
    if (!toggle || !menu) return;

    var backdrop = doc.createElement("div");
    backdrop.className = "nav-backdrop";
    doc.body.appendChild(backdrop);

    function open() {
      menu.classList.add("open"); backdrop.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
    }
    function close() {
      menu.classList.remove("open"); backdrop.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function () {
      menu.classList.contains("open") ? close() : open();
    });
    backdrop.addEventListener("click", close);
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ---------- Theme toggle (auto by default; remembers manual choice) ---------- */
  function initTheme() {
    var root = doc.documentElement;
    var saved = null;
    try { saved = localStorage.getItem("rm-theme"); } catch (e) {}
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);

    function currentlyDark() {
      var t = root.getAttribute("data-theme");
      if (t) return t === "dark";
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    function paint(btn) { if (btn) btn.textContent = currentlyDark() ? "☀️" : "🌙"; }

    doc.querySelectorAll(".theme-toggle").forEach(function (btn) {
      paint(btn);
      btn.addEventListener("click", function () {
        var next = currentlyDark() ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("rm-theme", next); } catch (e) {}
        var tc = doc.querySelector('meta[name="theme-color"]');
        if (tc) tc.setAttribute("content", next === "dark" ? "#061a13" : "#08261c");
        doc.querySelectorAll(".theme-toggle").forEach(paint);
      });
    });
  }

  /* ---------- Back to top ---------- */
  function initToTop() {
    var btn = doc.createElement("button");
    btn.className = "to-top"; btn.setAttribute("aria-label", "Back to top"); btn.innerHTML = "↑";
    doc.body.appendChild(btn);
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    window.addEventListener("scroll", function () {
      btn.classList.toggle("show", window.scrollY > 600);
    }, { passive: true });
  }

  /* ---------- Article page: reading progress, reading time, share ---------- */
  function initArticle() {
    var body = doc.getElementById("article-body");
    if (!body) return;
    doc.body.classList.add("is-article");

    var bar = doc.getElementById("reading-progress");
    function updateBar() {
      if (!bar) return;
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      var pct = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
    }
    window.addEventListener("scroll", updateBar, { passive: true });
    window.addEventListener("resize", updateBar);
    updateBar();

    // Reading time + share, once the article content is rendered by drive.js
    function enhance() {
      var text = body.textContent || "";
      var words = text.trim().split(/\s+/).filter(Boolean).length;
      if (words > 40) {
        var mins = Math.max(1, Math.round(words / 200));
        var meta = doc.getElementById("article-meta");
        if (meta && !meta.querySelector(".rt")) {
          var span = doc.createElement("span");
          span.className = "rt";
          span.textContent = mins + " min read";
          meta.appendChild(span);
        }
        buildShare();
        return true;
      }
      return false;
    }
    function buildShare() {
      if (doc.querySelector(".share-bar")) return;
      var wrap = doc.querySelector(".article-wrap");
      if (!wrap) return;
      var bar = doc.createElement("div");
      bar.className = "share-bar";
      bar.innerHTML = '<span class="lbl">Share:</span>';

      var nativeBtn = null;
      if (navigator.share) {
        nativeBtn = mkBtn("↗ Share", function () {
          navigator.share({ title: doc.title, url: location.href }).catch(function () {});
        });
        bar.appendChild(nativeBtn);
      }
      var url = encodeURIComponent(location.href);
      var title = encodeURIComponent(doc.title);
      bar.appendChild(mkLink("Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + url));
      bar.appendChild(mkLink("X", "https://twitter.com/intent/tweet?text=" + title + "&url=" + url));
      var copy = mkBtn("Copy link", function () {
        var done = function () { copy.classList.add("copied"); copy.textContent = "✓ Copied"; setTimeout(function () { copy.classList.remove("copied"); copy.textContent = "Copy link"; }, 1800); };
        if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, fallbackCopy);
        else fallbackCopy();
        function fallbackCopy() { var t = doc.createElement("textarea"); t.value = location.href; doc.body.appendChild(t); t.select(); try { doc.execCommand("copy"); done(); } catch (e) {} doc.body.removeChild(t); }
      });
      bar.appendChild(copy);
      wrap.insertBefore(bar, wrap.firstChild);
    }
    function mkBtn(label, fn) { var b = doc.createElement("button"); b.className = "share-btn"; b.type = "button"; b.textContent = label; b.addEventListener("click", fn); return b; }
    function mkLink(label, href) { var a = doc.createElement("a"); a.className = "share-btn"; a.href = href; a.target = "_blank"; a.rel = "noopener"; a.textContent = label; return a; }

    if (!enhance()) {
      var obs = new MutationObserver(function () { if (enhance()) obs.disconnect(); });
      obs.observe(body, { childList: true, subtree: true });
      setTimeout(function () { enhance(); obs.disconnect(); }, 8000);
    }
  }

  /* ---------- PWA: register service worker + install hint ---------- */
  function initPWA() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      });
    }
    var deferred = null;
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); deferred = e; showHint();
    });
    function dismissed() { try { return localStorage.getItem("rm-install-dismissed") === "1"; } catch (e) { return false; } }
    function showHint() {
      if (dismissed()) return;
      var hint = doc.createElement("div");
      hint.className = "install-hint show";
      hint.innerHTML = '<p><b>Install Ravenmails</b> — read offline, like an app.</p>';
      var install = doc.createElement("button");
      install.className = "btn btn-gold"; install.textContent = "Install";
      install.addEventListener("click", function () {
        hint.classList.remove("show");
        if (deferred) { deferred.prompt(); deferred = null; }
      });
      var x = doc.createElement("button");
      x.className = "x"; x.setAttribute("aria-label", "Dismiss"); x.innerHTML = "×";
      x.addEventListener("click", function () { hint.classList.remove("show"); try { localStorage.setItem("rm-install-dismissed", "1"); } catch (e) {} });
      hint.appendChild(install); hint.appendChild(x);
      doc.body.appendChild(hint);
    }
  }

  function init() {
    setYear(); markActive(); initNav(); initTheme(); initToTop(); initArticle(); initPWA();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
