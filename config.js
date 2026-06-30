// Ravenmails site config
// 1) Share the "Ravenmails Articles" Drive folder: Anyone with the link → Viewer.
// 2) Create a Google API key (Drive API enabled) and paste it below.
//    See Drive-Articles-Setup.md for the 5-minute walkthrough.
window.RAVENMAILS_CONFIG = {
  DRIVE_FOLDER_ID: "1PK41aozHwVsbwPXyjw84CbvZERvO6bJa",
  GOOGLE_API_KEY: "AIzaSyAHkQWdNvpLWyP9dYfc7QnTk2m7qQvsXYg",

  // --- Advertising (optional) -------------------------------------------------
  // Ravenmails stays free via clearly-labeled, non-intrusive ads.
  // Leave these blank and NO ads render (no empty boxes). To turn ads on:
  //   1. Get approved for Google AdSense → copy your publisher ID below
  //      (looks like "ca-pub-1234567890123456").
  //   2. In AdSense, create two display ad units and paste their slot IDs
  //      (the numeric "data-ad-slot" value) into AD_SLOTS.
  //   3. Put your publisher ID in ads.txt at the site root (instructions inside).
  ADSENSE_CLIENT: "",
  AD_SLOTS: { home: "", article: "" },

  // --- Article cover images -------------------------------------------------
  // Each article shows a cover image (card thumbnail + top of the article).
  // Map a Drive doc ID -> an image (real photo OR a labeled illustration).
  // Any article without a mapping falls back to DEFAULT_COVER.
  // Tip: to use a real photo, drop it in assets/covers/ and point to it here.
  ARTICLE_COVERS: {
    "17cD2Gub9wLu6dfYCg4p-qa-_mrZir_PcyrIiazZmJKU": "assets/covers/six-minds.svg",
    "1YSWtPQ_X_1IlGhJjs6Pb7kQPwV_VZJnyQ0-Ca6pv8sk": "assets/covers/iscape-amr.svg",
    "1EYicm0STpXF18Z3KbvB17VPu6Pu-y_Wdjonfo2OmUgE": "assets/covers/energy-lockdown-factcheck.svg",
    "1GxQJ0fW8L0oG0OTyC4F0ZcRL-PxZQ2OYz4EnNJ29-bw": "assets/covers/dengue-climate.svg",
    "1bOqV6pwQJ5JdYLw_N79L2zbghIVXSPJGhivrE-6fJDg": "assets/covers/nast-young-scientists-2026-finalists.svg",
    "1GW_prLSJ-Ad4_Sis05bx2hhYHIGSMZdcsGasicF15BI": "assets/covers/mojica-microplastics-honey.svg"
  },
  DEFAULT_COVER: "assets/covers/default.svg"
};
