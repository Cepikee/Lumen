import HiradoClient from "@/components/HiradoClient";

export default function HiradoPage({ searchParams }: any) {
  const raw = searchParams?.video;
  const videoId = Array.isArray(raw) ? raw[0] : raw;

  return <HiradoClient videoId={videoId} />;
}
