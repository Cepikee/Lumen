const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const faq = read('app/premium-faq/page.tsx');

// Payment is intentionally unavailable without a provider integration. The UI
// must not imply that checkout is live or leave a misleading input enabled.
const { load, render, nodes } = require('../helpers/render-ui.cjs');
const Page = load('app/premium/page.tsx').default;
const tree = nodes(Page());
const buttons = tree.filter(n => n.type === 'button');
assert.equal(buttons.length, 4, 'monthly, annual, supporter and company offers');
assert.ok(buttons.every(n => n.props.disabled === true && n.props.type === 'button' && !n.props.onClick));
assert.ok(tree.filter(n => ['input','select','textarea'].includes(n.type)).every(n => n.props.disabled === true));
assert.equal(tree.filter(n => n.type === 'form').length, 0);
assert.ok(tree.filter(n => n.props?.href).every(n => ['#premium-plans','/premium-faq'].includes(n.props.href)));
assert.match(render(Page), /Az előfizetés és a próbaidő jelenleg nem érhető el/);
assert.match(faq, /fizetési szolgáltatása jelenleg nem érhető el/);
assert.doesNotMatch(faq, /jelenleg <strong>Barion<\/strong> fizetéssel érhető el/);

console.log('premium availability contract regression: PASS');
