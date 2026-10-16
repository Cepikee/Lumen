"use strict";
// Explicit background entrypoint. No LLM calls; forecast publication is run-scoped.
const mysql=require('mysql2/promise');
const repository=require('./snapshot-repository');
async function runForecastPipeline() {
 const connection=await mysql.createConnection({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'utom_app',password:process.env.DB_PASSWORD,database:process.env.DB_NAME||'utom_dev',timezone:'Z'});
 try{return await repository.run(connection);}finally{await connection.end();}
}
async function mainLoop(){while(true){try{console.log('Forecast run',await runForecastPipeline());}catch(error){console.error('Forecast run failed',error.message);}await new Promise(resolve=>setTimeout(resolve,345*60000));}}
if(require.main===module){require('dotenv').config();require('../lib/config/runtime').assertCapability('backgroundJobs');mainLoop().catch(()=>{process.exitCode=1;});}
module.exports={runForecastPipeline,mainLoop};
