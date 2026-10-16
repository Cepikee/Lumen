import { NextResponse } from 'next/server';
import { securityCheck } from '@/lib/security';
import { getInsightsSnapshot } from '@/lib/insights-snapshot';

export async function GET(request: Request) {
  const denied = await securityCheck(request);
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    const allowed = new Set(['period','asOf','category','source','keyword','cluster','page','phase']);
    if ([...params.keys()].some(k=>!allowed.has(k))) return NextResponse.json({success:false,error:'unsupported_filter'}, {status:400});
    return NextResponse.json(await getInsightsSnapshot(params), {headers:{'Cache-Control':'private, no-store'}});
  } catch(error) {
    const message = error instanceof Error ? error.message : '';
    const invalid = message.startsWith('invalid_');
    return NextResponse.json({success:false,error:invalid?message:['snapshot_capacity_exceeded','snapshot_expired'].includes(message)?message:'insights_unavailable'}, {status:invalid?400:message==='snapshot_expired'?410:503});
  }
}
