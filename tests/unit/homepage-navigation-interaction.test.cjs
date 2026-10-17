const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { act } = React;
const { createRoot } = require("react-dom/client");
const { JSDOM } = require("jsdom");

const originalLoad = Module._load;
const originalTsx = Module._extensions[".tsx"];
const originalCss = Module._extensions[".css"];

Module._load = function(request, parent, isMain) {
  if (request === "next/link") {
    return { __esModule: true, default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) };
  }
  return originalLoad.call(this, request, parent, isMain);
};
Module._extensions[".css"] = (module) => {
  module.exports = { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) };
};
Module._extensions[".tsx"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  module._compile(output, filename);
};

after(() => {
  Module._load = originalLoad;
  if (originalTsx) Module._extensions[".tsx"] = originalTsx;
  else delete Module._extensions[".tsx"];
  if (originalCss) Module._extensions[".css"] = originalCss;
  else delete Module._extensions[".css"];
});

test("homepage rail buttons change the rendered view instead of remaining inert", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = async () => ({ ok: true, json: async () => ({ keywords: [] }) });

  const homeModule = require("../../components/HomeFeedLayout.tsx");
  const HomeFeedLayout = homeModule.default;
  assert.deepEqual(homeModule.rankLoadedSources([
    { source_id: 4, source: "hvg.hu" },
    { source_id: 1, source: "telex.hu" }
  ]), [["hvg.hu", 1], ["telex.hu", 1]]);
  function Harness() {
    const [view, setView] = React.useState("feed");
    const [category, setCategory] = React.useState("");
    const [source, setSource] = React.useState("");
    const items = [
      { id: 1, url: "https://hvg.hu/a", source_id: 4, content: "A", title: "A", detailed_content: "", ai_clean: 1, created_at: "2026-10-17T10:00:00Z", category: "Közélet" },
      { id: 2, url: "https://telex.hu/b", source_id: 1, content: "B", title: "B", detailed_content: "", ai_clean: 1, created_at: "2026-10-17T11:00:00Z", category: "Politika" }
    ];
    return React.createElement(HomeFeedLayout, {
      items, view, category, source, onView: setView,
      onCategory: (value) => { setCategory(value); setSource(""); setView("categories"); },
      onSource: (value) => { setSource(value); setCategory(""); setView("sources"); },
      children: React.createElement("div", null, "feed")
    });
  }

  const root = createRoot(document.getElementById("root"));
  await act(async () => { root.render(React.createElement(Harness)); });
  const button = (label) => [...document.querySelectorAll("button")].find((item) => item.textContent.trim() === label);

  assert.equal(button("Friss hírek").getAttribute("aria-pressed"), "true");
  await act(async () => { button("Kategóriák").click(); });
  const categoryView = document.querySelector('[aria-label="Kategóriák nézet"]');
  assert.ok(categoryView);
  assert.equal(button("Kategóriák").getAttribute("aria-pressed"), "true");
  await act(async () => { [...categoryView.querySelectorAll("button")].find((item) => item.textContent.includes("Politika")).click(); });
  const selectedCategoryView = document.querySelector('[aria-label="Kategóriák nézet"]');
  assert.match(selectedCategoryView.textContent, /Politika1/);
  assert.ok([...selectedCategoryView.querySelectorAll("button")].find((item) => item.textContent.includes("Politika")).className.includes("active"));

  await act(async () => { button("Források").click(); });
  const sourceView = document.querySelector('[aria-label="Források nézet"]');
  assert.ok(sourceView);
  assert.equal(button("Források").getAttribute("aria-pressed"), "true");
  const sourceButtons = [...sourceView.querySelectorAll("button")];
  assert.equal(sourceButtons.length, 2);
  await act(async () => { sourceButtons[0].click(); });
  const selectedSourceView = document.querySelector('[aria-label="Források nézet"]');
  assert.ok([...selectedSourceView.querySelectorAll("button")][0].className.includes("active"));

  await act(async () => { button("Friss hírek").click(); });
  assert.equal(document.querySelector('[aria-label="Kategóriák nézet"]'), null);
  assert.equal(document.querySelector('[aria-label="Források nézet"]'), null);
  assert.equal(button("Friss hírek").getAttribute("aria-pressed"), "true");

  await act(async () => { root.unmount(); });
  dom.window.close();
});
