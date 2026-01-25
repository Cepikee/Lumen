import HiradoClient from "@/components/HiradoClient";

type HiradoPageProps = {
  searchParams: {
    video?: string | string[];
  };
};

export default function HiradoPage({ searchParams }: HiradoPageProps) {
  const raw = searchParams?.video;
  const videoId = Array.isArray(raw) ? raw[0] : raw; // <-- nincs több null

  return <HiradoClient videoId={videoId} />;
}
