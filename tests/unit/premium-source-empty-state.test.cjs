const assert = require('node:assert/strict');
const { load, render, React } = require('../helpers/render-ui.cjs');
const Empty = load('components/InsightsEmptyState.tsx').default;
const cases = [
 ['WSourceClickbait','sources'], ['WSourceClickbaitRatio','sources'],
 ['WSourceDuplication','duplication'], ['WSourceSpeedIndexLeaderboard','leaderboard'],
 ['WSourceCategoryDistribution','items'],
];
for (const [name, field] of cases) {
 let result, request;
 const Component = load(`components/${name}.tsx`, {
  swr: (url) => { request = url; return result; },
  '@/store/useUserStore': {useUserStore: select => select({theme:'dark'})},
  '@/components/UtomModal': () => null, './InsightsEmptyState': Empty,
  'next/dynamic': () => () => { throw Error('Empty state must not render chart'); },
  recharts: {}, 'framer-motion': {}, 'react-chartjs-2': {},
  'chart.js': {Chart:{register(){}}}, 'react-bootstrap/Spinner': () => React.createElement('span'),
 }).default;
 for (const period of ['24h','7d','30d','90d']) {
  result = {data:{success:true,[field]:[]},isLoading:false};
  const html = render(Component,{period});
  assert.match(html, name.includes('SpeedIndex') ? /Nincs elérhető Speed Index adat/ : /Nincs elég adat/);
  if (!name.includes('SpeedIndex')) {
   assert.ok(request.endsWith(`period=${period}`));
   assert.ok(html.includes(period === '24h' ? '24 órából' : `${parseInt(period)} napból`));
  }
 }
 result = {isLoading:true};
 assert.match(render(Component), /Betöltés/);
 result = {error:new Error('HTTP 503'),data:{success:true,[field]:[]},isLoading:false};
 assert.match(render(Component), /Hiba|Nem sikerült/);
 assert.doesNotMatch(render(Component), /Nincs elég adat|Nincs elérhető/);
 result = {data:{success:false},isLoading:false};
 assert.match(render(Component), /Hiba|Nem sikerült/);
}
console.log('premium source rendered empty/loading/error regression: PASS');
