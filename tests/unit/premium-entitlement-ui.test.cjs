const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '../../', file), 'utf8');
const header = read('components/Header.tsx');
const profile = read('components/ProfileView.tsx');
const settings = read('components/SettingsView.tsx');
const insights = read('components/InsightsDashboard.tsx');

assert.match(header, /return u\.isPremium === true/);
assert.match(header, /useUserStore\.getState\(\)\.loadUser/);
assert.doesNotMatch(header, /fetch\(["']\/api\/auth\/me/);
assert.match(profile, /const premiumActive = user\.isPremium === true/);
assert.match(settings, /const premiumActive = user\.isPremium === true/);
const { load, render } = require('../helpers/render-ui.cjs');
let state = {user:null,loading:true};
const Dashboard = load('components/InsightsDashboard.tsx', {
 'next/navigation': {}, swr: () => { throw Error('unexpected request'); },
 './InsightsCharts': {}, '@/store/useUserStore': {useUserStore: select => select(state)},
 '@/hooks/useInsightsSnapshot': {}, './InsightsIntelligence': {}, './InsightsSourceIntelligence': {},
 '@/hooks/useForecast': {}, './InsightsEmptyState': {}, '@/components/UtomModal': {}, '@/lib/insights-dashboard': {},
}).default;
assert.match(render(Dashboard), /Profil betöltése/);
for (const user of [null, {isPremium:false}]) {
 state = {user,loading:false};
 assert.match(render(Dashboard), /Prémium hozzáférés szükséges/);
 assert.match(render(Dashboard), /href="\/premium"/);
}
state={user:{isPremium:true},loading:false};
assert.equal(Dashboard().type.name, 'DashboardContent');
assert.match(read('app/insights/page.tsx'), /<InsightsDashboard/);
assert.doesNotMatch(insights, /apiUser\?\.user\?\.is_premium/);
assert.doesNotMatch(insights, /fetch\(["']\/api\/auth\/me/);
assert.doesNotMatch(insights, /apiChecked/);

console.log('premium entitlement UI regression: PASS');
