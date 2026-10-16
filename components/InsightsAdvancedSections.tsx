"use client";

import type { IntelligenceSnapshot } from "@/hooks/useInsightsSnapshot";
import InsightsSourceIntelligence from "./InsightsSourceIntelligence";
import styles from "./InsightsDashboard.module.css";

export default function InsightsAdvancedSections({ data }: { data: IntelligenceSnapshot }) {
  return <section className={styles.advancedSection} aria-labelledby="advanced-title">
    <div className={styles.sectionHeading}>
      <div><span className={styles.eyebrow}>MÉLYEBB BETEKINTÉS</span><h2 id="advanced-title">Részletes elemzés</h2></div>
      <p>Források, hírciklusok, eseménycsoportok és bizonyítékok.</p>
    </div>
    <details className={styles.advancedDisclosure}>
      <summary><span>Haladó nézet megnyitása</span><small>Forrásfigyelő · életciklusok · V2 bizonyítékok</small></summary>
      <div className={styles.advancedBody}><InsightsSourceIntelligence data={data} /></div>
    </details>
  </section>;
}
