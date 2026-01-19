"use client";

type InsightSourceRingProps = {
  sources?: {
    name: string;
    percent: number;
    color?: string;
  }[];
};

export default function InsightSourceRing({ sources }: InsightSourceRingProps) {
  return (
    <div className="insight-source-ring">
      <div className="insight-source-ring-inner"></div>
    </div>
  );
}
