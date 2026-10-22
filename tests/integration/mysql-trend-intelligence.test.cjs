const test=require('node:test');const assert=require('node:assert/strict');const mysql=require('mysql2/promise');const {randomUUID}=require('node:crypto');
const load=require('../helpers/insights-loader.cjs');const core=load('lib/trend-intelligence.ts');const service=load('lib/trend-intelligence-service.ts',{'./trend-intelligence':core});
const enabled=process.env.UTOM_MYSQL_TEST_OPT_IN==='true'&&Boolean(process.env.UTOM_TEST_MYSQL_URL);
test('MySQL: canonical observations reconcile list/history/sources/article drilldown without duplicate retries',{skip:!enabled?'Requires loopback migrated _test database + explicit opt-in':false},async()=>{
 const u=new URL(process.env.UTOM_TEST_MYSQL_URL);assert.ok(['localhost','127.0.0.1','::1'].includes(u.hostname));assert.match(u.pathname,/_test$/);
 const c=await mysql.createConnection({host:u.hostname,port:Number(u.port||3306),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.slice(1),timezone:'Z',dateStrings:true});
 const token='trend-'+randomUUID();
 try{await c.query("SET time_zone = '+00:00'");await c.beginTransaction();
  const now=new Date('2026-10-25T12:34:00Z');const query=core.parseTrendQuery(new URLSearchParams({keyword:token,category:'Tech',period:'7d'}),now);
  const ids=[];for(const [i,source] of ['telex','444',null].entries()){
   const [r]=await c.execute('INSERT INTO articles(title,url_canonical,category,source,published_at) VALUES(?,?,?,?,?)',[token+' '+i,'https://example.test/'+token+'/'+i,'Tech',source,'2026-09-01 00:00:00']);ids.push(r.insertId);
   await c.execute('INSERT INTO keywords(article_id,keyword,category,created_at) VALUES(?,?,?,?)',[r.insertId,token,'Tech','2026-10-21 12:00:00']);
  }
  // A repeated stored keyword must not create another observation or another article.
  await c.execute('INSERT INTO keywords(article_id,keyword,category,created_at) VALUES(?,?,?,?)',[ids[0],token,'Tech','2026-10-22 12:00:00']);
  await c.execute('INSERT INTO keywords(article_id,keyword,category,created_at) VALUES(?,?,?,?)',[ids[0],token,'Politika','2026-10-22 12:00:00']);
  const history=await service.readTrendIntelligence(c,query,'history');assert.equal(history.total,3);assert.equal(history.growth,null);core.validateHistory(history);
  const list=await service.readTrendIntelligence(c,query,'list');assert.equal(list.trends[0].freq,3);assert.equal(list.sourceBreakdown.reduce((a,b)=>a+b.count,0),3);
  query.bucket=history.history.find(p=>p.freq>0).timestamp;
  const articles=await service.readTrendIntelligence(c,query,'articles');assert.equal(articles.articles.length,3);assert.deepEqual(articles.articles.map(a=>a.id).sort(),ids.sort());
  const filtered=await service.readTrendIntelligence(c,{...query,sources:['telex']},'history');assert.equal(filtered.total,1);
  const other=await service.readTrendIntelligence(c,{...query,category:'Politika'},'history');assert.equal(other.total,1);
  const sql=service.observationSql(query);const [explain]=await c.execute(sql.sql+' SELECT * FROM observations',sql.values);assert.equal(explain.length,3);
 }finally{await c.rollback();await c.end();}
});
