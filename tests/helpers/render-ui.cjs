const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Execute the real TSX; replace only explicitly supplied integration boundaries.
function load(file, deps = {}, env = process.env) {
  const exports = {};
  const defaults = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, URL, console, process: { env }, require(name) {
    if (name in deps) return deps[name];
    if (name in defaults) return defaults[name];
    if (name.endsWith('.css')) return {};
    throw new Error('Unmocked UI dependency: ' + name);
  } });
  return exports;
}
function render(Component, props = {}) { return renderToStaticMarkup(React.createElement(Component, props)); }
function nodes(element) {
  if (!element || typeof element !== 'object') return [];
  if (Array.isArray(element)) return element.flatMap(nodes);
  return [element, ...nodes(element.props?.children)];
}
module.exports = { load, render, nodes, React };
