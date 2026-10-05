import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isV2DemoAllowed } from "@/lib/dev-v2-demo";
import V2DemoShowcase from "@/components/V2DemoShowcase";
import "./v2-demo.css";

export const dynamic = "force-dynamic";

export default async function V2DemoPage() {
  const host = (await headers()).get("host") || "";
  if (!isV2DemoAllowed(process.env, host)) {
    notFound();
  }
  return <V2DemoShowcase />;
}
