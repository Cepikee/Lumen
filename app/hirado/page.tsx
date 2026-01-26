import HiradoClient from "@/components/HiradoClient";

export default async function HiradoPage({ searchParams }: any) {
  const params = await searchParams;
  const raw = params?.video;
  const videoId = Array.isArray(raw) ? raw[0] : raw;

  return <HiradoClient videoId={videoId} />;
}
