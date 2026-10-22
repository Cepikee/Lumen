const test=require('node:test');const assert=require('node:assert/strict');
const {load,render}=require('../helpers/render-ui.cjs');const base=require('../helpers/insights-loader.cjs');
const core=base('lib/trend-intelligence.ts');
test('mini chart renders one real observation as one dot, never a duplicated line',()=>{
 const Mini=load('components/SparklineMini.tsx').default;
 const html=render(Mini,{history:[{freq:7,day:'2026-10-20'}]});assert.equal((html.match(/<circle/g)||[]).length,1);assert.equal((html.match(/<path/g)||[]).length,0);
 const empty=render(Mini,{history:[]});assert.match(empty,/Nincs idősor/);
 const flat=render(Mini,{history:[{freq:7},{freq:7}]});assert.match(flat,/M4.00,6.00 L146.00,6.00/);
});
test('detailed chart preserves real series, tooltip, legend and point callback',()=>{
 let captured;const noOp={register(){}};const deps={'@/lib/trend-intelligence':core,'chart.js':{Chart:noOp},'react-chartjs-2':{Line:props=>{captured=props;return null;}}};
 const Detailed=load('components/SparklineDetailed.tsx',deps).default;let selected=null;
 render(Detailed,{period:'24h',history:[{timestamp:'2026-10-25T01:00:00Z',freq:3}],series:[{label:'telex',values:[3],color:'#16b9ff'}],onPointSelect:i=>selected=i});
 assert.equal(captured.data.datasets[0].data.length,1);assert.equal(captured.options.plugins.legend.display,true);assert.equal(captured.options.plugins.tooltip.callbacks.label({dataset:{label:'telex'},parsed:{y:1234}}),'telex: '+(1234).toLocaleString('hu-HU'));captured.options.onClick(null,[{index:0}]);assert.equal(selected,0);
});
