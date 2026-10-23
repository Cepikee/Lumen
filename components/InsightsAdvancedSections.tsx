"use client";

import type { IntelligenceSnapshot } from "@/hooks/useInsightsSnapshot";
import InsightsSourceIntelligence from "./InsightsSourceIntelligence";
import styles from "./InsightsDashboard.module.css";

export default function InsightsAdvancedSections({ data }: { data: IntelligenceSnapshot }) {
  return <section className={styles.advancedSection} aria-labelledby="advanced-title">
    <div className={styles.sectionHeading}>
      <div><span className={styles.eyebrow}>MÉLYEBB BETEKINTÉS</span><h2 id="advanced-title">Részletes elemzés</h2></div>
      <p>Források, terjedési minták, témacsoportok és a számítások mögötti cikkek.</p>
    </div>
    <div className={styles.advancedDisclosure}><div className={styles.advancedBody}><InsightsSourceIntelligence data={data} /></div></div>
  </section>;
}
