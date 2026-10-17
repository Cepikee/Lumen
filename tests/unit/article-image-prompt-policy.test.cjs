"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { imagePolicy } = require("../../lib/article-images/policy");
const { buildImagePrompt, imageFingerprint, PROMPT_VERSION } = require("../../lib/article-images/prompt");

test("editorial prompt is deterministic, sanitized and carries hard safety constraints", () => {
  const article = { id: 4, title: "Gazdasági hír <b>HTML</b>", short_summary: "Részletek https://example.test/x", category: "Gazdaság", keywords: ["forint", "kamat"] };
  const prompt = buildImagePrompt(article);
  assert.doesNotMatch(prompt, /<b>|https:\/\//);
  assert.match(prompt, /No text, letters, words, numbers, logos, watermarks/);
  assert.match(prompt, /Do not depict an identifiable real person/);
  const input = { articleId: 4, prompt, provider: "cloudflare", model: "model", width: 1024, height: 576 };
  assert.equal(imageFingerprint(input), imageFingerprint(input));
  assert.equal(PROMPT_VERSION, "UTOM_EDITORIAL_V1");
});

test("policy distinguishes generation, fallback and skip", () => {
  assert.equal(imagePolicy({ title: "Kamatdöntés", short_summary: "Döntött a jegybank" }, { enabled: true }).action, "generate");
  assert.equal(imagePolicy({ title: "Szexuális erőszak ügye" }, { enabled: true }).action, "fallback_only");
  assert.equal(imagePolicy({ title: "Hír", image_generation_disabled: true }, { enabled: true }).action, "skip");
  assert.equal(imagePolicy({ title: "Hír" }, { enabled: false }).action, "fallback_only");
  assert.equal(imagePolicy({ title: "Szexuális erőszak ügye" }, { enabled: true, force: true }).action, "fallback_only");
  assert.equal(imagePolicy({ title: "Hír", image_generation_disabled: true }, { enabled: true, force: true }).action, "skip");
});

test("prompt cues stay factual across neutral, trend, political, crime, tech and clickbait inputs", () => {
  const neutral = buildImagePrompt({ title: "Új program", short_summary: "Új támogatási program indul magyar kisvállalkozások számára." });
  assert.match(neutral, /Keep the visual direction neutral/);
  assert.doesNotMatch(neutral, /upward visual rhythm/);
  const growth = buildImagePrompt({ title: "Ipari adat", short_summary: "12 százalékkal nőtt az ipari termelés." });
  assert.match(growth, /subtle upward visual rhythm/);
  assert.match(growth, /do not show arrows, charts, labels, exact values/);
  const decline = buildImagePrompt({ title: "Árfolyam", short_summary: "Gyengült a forint az euróval szemben." });
  assert.match(decline, /downward pressure/);
  assert.match(decline, /do not show.*exchange rates/);
  const politics = buildImagePrompt({ title: "A miniszter bejelentése", short_summary: "A kormány új javaslatot tett." });
  assert.match(politics, /Do not depict an identifiable real person/);
  const crime = buildImagePrompt({ title: "Nyomozás indult", short_summary: "A rendőrség vizsgálja az ügyet." });
  assert.match(crime, /No graphic injury.*sensationalism/);
  const tech = buildImagePrompt({ title: "Új rendszer", short_summary: "Mesterséges intelligencia fut az adatközpont új chipjein." });
  assert.match(tech, /datacenter or semiconductor imagery is allowed/);
  const clickbait = buildImagePrompt({ title: "SOKKOLÓ FORDULAT!", short_summary: "A városi tanács elfogadta a költségvetést." });
  assert.ok(clickbait.indexOf("Primary factual context") < clickbait.indexOf("Secondary headline context"));
  assert.match(clickbait, /Treat headline rhetoric as secondary/);
});
