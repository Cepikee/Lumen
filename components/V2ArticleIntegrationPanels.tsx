"use client";
import { useEffect, useState } from "react";
import { useV2ArticleContext } from "@/hooks/useV2ArticleContext";
import V2ArticleContextPanel from "@/components/V2ArticleContextPanel";
import V2SourceComparisonPanel from "@/components/V2SourceComparisonPanel";
import V2PremiumIntelligencePanel from "@/components/V2PremiumIntelligencePanel";
import { isFrontendV2Enabled } from "@/lib/v2/frontend-config";
export default function V2ArticleIntegrationPanels({ articleId, enabled = isFrontendV2Enabled() }: { articleId: number; enabled?: boolean }) {
  const context = useV2ArticleContext(articleId, enabled);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  useEffect(() => {
    const events = context.data?.events || [];
    setSelectedEventId(events.length === 1 ? events[0].id : null);
  }, [articleId, context.data?.events]);
  const events = context.data?.events || [];
  return <>
    <V2ArticleContextPanel articleId={articleId} state={context} />
    {context.status === "ready" || context.status === "empty" ? <>
      <V2SourceComparisonPanel events={events} enabled={enabled} selectedEventId={selectedEventId} onEventChange={setSelectedEventId} />
      <V2PremiumIntelligencePanel eventId={selectedEventId} enabled={enabled} />
    </> : null}
  </>;
}
