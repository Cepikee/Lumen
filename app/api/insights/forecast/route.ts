import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { securityCheck } from '@/lib/security';
import { read } from '@/forecast/snapshot-repository';
export async function GET(request:Request){
 const denied=await securityCheck(request);if(denied)return denied;
 const params=new URL(request.url).searchParams;
 if([...params.keys()].some(k=>k!=='category'))return NextResponse.json({success:false,error:'unsupported_forecast_filter'},{status:400});
 const category=params.get('category')?.trim().toLocaleLowerCase('hu-HU')||null;
 try{return NextResponse.json(await read(db,Date.now(),category));}
 catch{return NextResponse.json({success:false,error:'forecast_unavailable',forecast:{}},{status:503});}
}
