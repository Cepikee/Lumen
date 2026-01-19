"use client";

type InsightSparklineProps = {
  trend?: number[];
};

export default function InsightSparkline({ trend }: InsightSparklineProps) {
  return (
    <div className="insight-sparkline">
      <div className="insight-sparkline-line"></div>
    </div>
  );
}
