const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/insights-dashboard.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: moduleObject.exports });
const { sentimentCounts, activityRows, clickbaitRows, categorySeries, rows } = moduleObject.exports;
test("empty and malformed data do not manufacture a chart", () => {
 assert.equal(rows({error:"failed"}).length,0);
 assert.equal(sentimentCounts(undefined).average,null);
 assert.equal(sentimentCounts({positive:null,negative:"invalid"}).total,0);
 assert.equal(activityRows({categories:["Sport"],hours:[0],matrix:{Sport:[0]}}).length,0);
 assert.equal(categorySeries(null,"24h").points.length,0);
});
test("real zero clickbait score remains meaningful while missing scores do not", () => {
 const data = clickbaitRows({sources:[{source:"a",count:2,avg_clickbait:0},{source:"b",count:2,avg_clickbait:null},{source:"c",count:0,avg_clickbait:30}]});
 assert.equal(data.length,1); assert.equal(data[0].score,0);
});
test("sentiment denominator is the actual measured total", () => {
 const data = sentimentCounts({positive:"3",neutral:1,negative:1});
 assert.equal(data.total,5); assert.equal(data.average,.4);
});
test("timeseries combines actual buckets without fake values", () => {
 const data=categorySeries([{category:"Sport",points:[{date:"2026-10-14T10:10:00Z",count:2},{date:"2026-10-14T10:30:00Z",count:3},{date:"invalid",count:99}]}],"24h");
 assert.equal(data.points.length,1); assert.equal(data.points[0].v0,5);
});

test("MySQL UTC timestamps retain their original instant", () => {
 const data=categorySeries([{category:"Sport",points:[{date:"2026-10-14 10:30:00",count:1}]}],"24h");
 assert.equal(data.points[0].time,Date.UTC(2026,9,14,10));
});
const { categorySentiments, sentimentSeries, timeLabel, forecastPoints } = moduleObject.exports;
test("category charts select at most six meaningful series with stable activity order", () => {
 const data=categorySeries(Array.from({length:8},(_,i)=>({category:"Category "+i,points:[{date:"2026-10-14T10:00:00Z",count:i+1}]})),"24h");
 assert.equal(data.categories.length,6);assert.equal(data.categories[0],"Category 7");
});
test("Budapest days group across UTC midnight and DST repeated hours remain distinct", () => {
 const data=categorySeries([{category:"Sport",points:[{date:"2026-10-14T22:30:00Z",count:2},{date:"2026-10-15T01:00:00Z",count:3}]}],"7d");
 assert.equal(data.points.length,1); assert.equal(data.points[0].v0,5);
 const timeline=sentimentSeries([{date:"2026-10-25T00:00:00Z",positive:2},{date:"2026-10-25T01:00:00Z",negative:3}],"24h");
 assert.equal(timeline.length,2);assert.equal(timeline[0].score,1);assert.equal(timeline[1].score,-1);
 assert.match(timeLabel(Date.parse("2026-10-14T10:00:00Z"),"24h"),/12:00/);
});
test("sentiment score is weighted by article counts and unmeasured points remain null", () => {
 const data=sentimentSeries([{date:"2026-10-14T10:00:00Z",positive:2},{date:"2026-10-14T11:00:00Z",negative:6}],"7d");
 assert.equal(data[0].score,-.5); assert.equal(data[0].total,8);
 assert.equal(sentimentSeries([{date:"2026-10-14T10:00:00Z",positive:null}],"24h")[0].score,null);
});
test("negative category bars descend; malformed objects and forecasts stay empty", () => {
 const data=categorySentiments({A:{positive:8,negative:2},B:{positive:1,negative:9},C:null});
 assert.equal(data[0].category,"B");assert.equal(data.length,2);
 assert.equal(categorySentiments([]).length,0);
 assert.equal(forecastPoints({Sport:[null,{date:"2026-10-14",predicted:null},{date:"invalid",predicted:5}]}).length,0);
 assert.equal(forecastPoints({Sport:[{date:"2026-10-14",predicted:0}]}).length,1);
});
