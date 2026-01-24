import HiradoPlayer from "@/components/HiradoPlayer";
import HiradoArchive from "@/components/HiradoArchive";

export default async function HiradoPage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/hirado/today`, {
    cache: "no-store",
  });

  const data = await res.json();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Utom Híradó</h1>

      {!data.hasVideo && (
        <div className="text-lg opacity-70">
          Ma még nincs híradó. Nézz vissza később.
        </div>
      )}

      {data.hasVideo && (
        <div>
          <HiradoPlayer video={data.video} />
        </div>
      )}

      <HiradoArchive />
    </div>
  );
}
