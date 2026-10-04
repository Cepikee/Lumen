"use strict";

function normalizeArticleContextResponse(payload) {
  if (!payload || typeof payload !== "object" || !payload.data || typeof payload.data !== "object") throw new TypeError("v2_context_response_invalid");
  const data = payload.data; const article = data.article;
  if (!article || typeof article !== "object" || !Number.isSafeInteger(Number(article.id))) throw new TypeError("v2_context_article_invalid");
  const timeline = data.timeline && typeof data.timeline === "object" ? data.timeline : {};
  return Object.freeze({ article: Object.freeze({ id: Number(article.id), title: typeof article.title === "string" ? article.title : null, source: typeof article.source === "string" ? article.source : null, category: typeof article.category === "string" ? article.category : null, publishedAt: typeof article.publishedAt === "string" ? article.publishedAt : null, summary: article.summary && typeof article.summary === "object" ? Object.freeze({ id: article.summary.id == null ? null : Number(article.summary.id), text: typeof article.summary.text === "string" ? article.summary.text : null }) : null }), events: Array.isArray(data.events) ? data.events.filter((event) => event && typeof event === "object" && Number.isSafeInteger(Number(event.id))).map((event) => Object.freeze({ id: Number(event.id), title: typeof event.title === "string" && event.title.trim() ? event.title.trim() : null })) : [], timeline: Object.freeze({ items: Array.isArray(timeline.items) ? timeline.items.filter((item) => item && typeof item === "object").map((item) => Object.freeze({ type: typeof item.type === "string" ? item.type : null, id: Number.isSafeInteger(Number(item.id)) ? Number(item.id) : null, validAt: typeof item.validAt === "string" ? item.validAt : null, displayAt: typeof item.displayAt === "string" ? item.displayAt : null })) : [], nextCursor: typeof timeline.nextCursor === "string" ? timeline.nextCursor : null }), asOf: typeof data.asOf === "string" ? data.asOf : null });
}

module.exports = { normalizeArticleContextResponse };
