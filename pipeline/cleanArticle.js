// cleanArticle.js
const { JSDOM } = require("jsdom");

/**
 * Forrás domain felismerése az URL alapján
 */
function detectSource(url = "") {
  const u = url.toLowerCase();

  if (u.includes("index.hu")) return "index";
  if (u.includes("portfolio.hu")) return "portfolio";
  if (u.includes("24.hu")) return "24";
  if (u.includes("telex.hu")) return "telex";
  if (u.includes("hvg.hu")) return "hvg";

  return "generic";
}

/**
 * Cikk-törzs selectora forrásonként
 */
const SELECTORS = {
  index: ".cikk-torzs, .cikk-torzs__body, .article-content",
  portfolio: ".article-content, .portfolio-article, #articleContent",
  "24": ".entry-content, .article-content, .post-content",
  telex: ".article-body, .content-body, .post-content",
  hvg: ".article-content, .article-body, #article-content",
  generic: "article, .article, .content, .post-content"
};

/**
 * HTML-ből tiszta szöveg kinyerése:
 * - csak a cikk törzse
 * - reklámok, kapcsolódó cikkek, képek, videók nélkül
 */
function cleanArticle(html, url) {
  if (!html || typeof html !== "string") return "";

  const source = detectSource(url);
  const selector = SELECTORS[source] || SELECTORS.generic;

  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  // 1) Cikk törzs keresése
  let root = doc.querySelector(selector);

  // Ha nem találjuk, próbáljuk a generic-et
  if (!root) {
    root = doc.querySelector(SELECTORS.generic);
  }

  if (!root) {
    // Végső fallback: teljes body, de ez ritka
    root = doc.body;
  }

  // 2) Felesleges elemek eltávolítása
  const removeSelectors = [
    "script",
    "style",
    "aside",
    "nav",
    "footer",
    "header",
    "figure",
    "img",
    "video",
    "iframe",
    "noscript",
    ".related",
    ".ajanlo",
    ".kapcsolodo",
    ".hirdetes",
    ".advertisement",
    ".ad",
    ".ads",
    ".promo",
    ".newsletter",
    ".social",
    ".comments"
  ];

  for (const sel of removeSelectors) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }

  // 3) Nyers szöveg kinyerése
  let text = root.textContent || "";

  // 4) Whitespace tisztítás
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

module.exports = { cleanArticle };
