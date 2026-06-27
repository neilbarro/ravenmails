/* Ravenmails — Google Drive article loader.
   Reads Google Docs from a shared Drive folder and renders them in the site template. */
(function () {
  var CFG = window.RAVENMAILS_CONFIG || {};
  var KEY = CFG.GOOGLE_API_KEY || "";
  var FOLDER = CFG.DRIVE_FOLDER_ID || "";
  var ready = KEY && KEY.indexOf("PASTE_") === -1 && FOLDER;
  var COVERS = CFG.ARTICLE_COVERS || {};
  var DEFAULT_COVER = CFG.DEFAULT_COVER || "";
  function coverFor(id) { return COVERS[id] || DEFAULT_COVER || ""; }
  function isIllustration(src) { return /\.svg(\?|$)/i.test(src || ""); }

  var DISCLAIMERS =
    '<div class="disclaimer"><b>Photo disclaimer.</b> Photos are courtesy of their original owners and used for non-commercial, educational, and news-reporting purposes; rights remain with the owner. Any image marked as an illustration is an AI-generated artistic representation, not a photograph.</div>' +
    '<div class="disclaimer"><b>AI-use disclosure.</b> Produced with AI assistance for research, drafting, and any illustrations. All facts were verified against the cited sources and reviewed by the Ravenmails team before publication. Ravenmails takes full editorial responsibility for this content.</div>' +
    '<div class="credit-note"><b>Ravenmails</b> — the truth, delivered. Spotted an error or want to add a quote? Message us and we’ll fix it fast.</div>';

  function fmtDate(s) {
    try { return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
    catch (e) { return ""; }
  }
  function api(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r; });
  }
  function listArticles() {
    var q = "'" + FOLDER + "' in parents and mimeType='application/vnd.google-apps.document' and trashed=false";
    var url = "https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(q) +
      "&orderBy=modifiedTime desc&fields=" + encodeURIComponent("files(id,name,modifiedTime,description)") +
      "&key=" + KEY;
    return api(url).then(function (r) { return r.json(); }).then(function (j) { return j.files || []; });
  }
  function getDocHtml(id) {
    var url = "https://www.googleapis.com/drive/v3/files/" + id + "/export?mimeType=text/html&key=" + KEY;
    return api(url).then(function (r) { return r.text(); });
  }

  // Clean Google Docs export HTML -> tidy body node + extracted title
  function cleanDoc(raw) {
    var d = new DOMParser().parseFromString(raw, "text/html");
    d.querySelectorAll("style,script,meta,title,link").forEach(function (e) { e.remove(); });
    var body = d.body;
    // unwrap Google redirect links
    body.querySelectorAll("a[href]").forEach(function (a) {
      try {
        var u = new URL(a.getAttribute("href"), location.href);
        if (u.hostname.indexOf("google.com") > -1 && u.searchParams.get("q")) a.setAttribute("href", u.searchParams.get("q"));
      } catch (e) {}
      a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener");
    });
    body.querySelectorAll("*").forEach(function (e) {
      e.removeAttribute("class"); e.removeAttribute("id");
      if (e.hasAttribute("style")) {
        var s = e.style, keep = [];
        var fw = s.fontWeight;
        if (fw === "700" || fw === "bold" || (parseInt(fw, 10) >= 600)) keep.push("font-weight:700");
        if (s.fontStyle === "italic") keep.push("font-style:italic");
        if (s.textDecorationLine && s.textDecorationLine.indexOf("underline") > -1) keep.push("text-decoration:underline");
        if (keep.length) e.setAttribute("style", keep.join(";")); else e.removeAttribute("style");
      }
    });
    // title = first heading
    var h = body.querySelector("h1, h2");
    var title = h ? h.textContent.trim() : "";
    if (h) h.remove();
    // pull the first embedded photo out for the hero (a real photo beats the illustration)
    var firstImg = body.querySelector("img");
    var image = firstImg ? (firstImg.getAttribute("src") || "") : "";
    if (firstImg) firstImg.remove();
    // drop empty paragraphs
    body.querySelectorAll("p").forEach(function (p) { if (!p.textContent.trim() && !p.querySelector("img,a")) p.remove(); });
    return { title: title, html: body.innerHTML, image: image };
  }
  function firstText(html) {
    var d = new DOMParser().parseFromString(html, "text/html");
    var p = d.querySelector("p");
    var t = p ? p.textContent.trim() : "";
    return t.length > 160 ? t.slice(0, 157) + "…" : t;
  }

  // ---- Render homepage list ----
  function renderIndex(el) {
    if (!ready) {
      el.innerHTML = '<p class="sub" style="grid-column:1/-1">Articles are published from our Google Drive. Set the API key in <code>config.js</code> to go live. (See Drive-Articles-Setup.md.)</p>';
      return;
    }
    el.innerHTML = '<p class="sub" style="grid-column:1/-1">Loading the latest…</p>';
    listArticles().then(function (files) {
      if (!files.length) { el.innerHTML = '<p class="sub" style="grid-column:1/-1">No articles yet — add a Google Doc to the Ravenmails Articles folder.</p>'; return; }
      el.innerHTML = "";
      files.forEach(function (f) {
        var a = document.createElement("a");
        a.className = "card"; a.href = "article.html?id=" + encodeURIComponent(f.id);
        var cover = coverFor(f.id);
        var thumb = '<div class="thumb"><span class="badge">ARTICLE</span><span class="emoji">🔬</span>' +
          (cover ? '<img class="thumb-img" loading="lazy" src="' + cover + '" alt="" onerror="this.remove()">' : '') +
          '</div>';
        a.innerHTML =
          thumb +
          '<div class="body"><span class="date">' + fmtDate(f.modifiedTime) + '</span>' +
          '<h3>' + (f.name || "Untitled") + '</h3>' +
          '<p>' + (f.description ? f.description : "Read the full story on Ravenmails.") + '</p>' +
          '<span class="read">Read article →</span></div>';
        el.appendChild(a);
      });
    }).catch(function (e) {
      el.innerHTML = '<p class="sub" style="grid-column:1/-1">Couldn’t load articles right now. Check the folder sharing and API key. (' + e.message + ')</p>';
    });
  }

  // ---- Render a single article ----
  function renderArticle() {
    var id = new URLSearchParams(location.search).get("id");
    var titleEl = document.getElementById("article-title");
    var metaEl = document.getElementById("article-meta");
    var bodyEl = document.getElementById("article-body");
    if (!id) { bodyEl.innerHTML = "<p>Missing article id.</p>"; return; }
    if (!ready) { bodyEl.innerHTML = "<p>The site isn’t connected to Drive yet. Add the API key in config.js.</p>"; return; }
    Promise.all([getDocHtml(id), api("https://www.googleapis.com/drive/v3/files/" + id + "?fields=name,modifiedTime&key=" + KEY).then(function (r) { return r.json(); })])
      .then(function (res) {
        var cleaned = cleanDoc(res[0]); var meta = res[1] || {};
        var title = meta.name || cleaned.title || "Article";
        document.title = title + " — Ravenmails";
        if (titleEl) titleEl.textContent = title;
        if (metaEl) metaEl.textContent = "By the Ravenmails Team · " + fmtDate(meta.modifiedTime);
        var heroSrc = cleaned.image || coverFor(id);
        var heroHtml = "";
        if (heroSrc) {
          var cap = (!cleaned.image && isIllustration(heroSrc))
            ? '<figcaption class="cover-cap">Illustration — AI-generated artistic representation, not a photograph.</figcaption>' : '';
          heroHtml = '<figure class="article-cover"><img src="' + heroSrc + '" alt="" onerror="var f=this.closest(\'figure\');if(f)f.remove()">' + cap + '</figure>';
        }
        bodyEl.innerHTML = heroHtml + cleaned.html + DISCLAIMERS +
          '<p style="margin-top:26px"><a href="index.html">← Back to all articles</a> · <a href="editorial-standards.html">Our editorial standards</a></p>';
      })
      .catch(function (e) {
        bodyEl.innerHTML = "<p>Couldn’t load this article. Make sure the Drive folder is shared (Anyone with the link) and the API key is set. (" + e.message + ")</p>";
      });
  }

  window.Ravenmails = { renderIndex: renderIndex, renderArticle: renderArticle };
})();
