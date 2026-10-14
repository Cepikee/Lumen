import { Suspense } from "react";
import InsightsDashboard from "@/components/InsightsDashboard";

export default function InsightsPage() {
  return <Suspense fallback={null}><InsightsDashboard /></Suspense>;
}
