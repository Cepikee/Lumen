interface SkeletonProps {
  height: string | number;
  width: string | number;
  radius?: number;
}

export default function Skeleton({ height, width, radius = 8 }: SkeletonProps) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: radius,
        background: "linear-gradient(90deg, #e0e0e0 0%, #f5f5f5 50%, #e0e0e0 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}
