import { Download, ExternalLink, FileText, Film, Play } from "lucide-react";

function getYouTubeVideoId(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host !== "youtu.be" && host !== "youtube.com" && !host.endsWith(".youtube.com")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be" ? parts[0] : parsed.searchParams.get("v") ?? (parts[0] === "watch" ? null : parts[1]);
    return id && /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function ImageStrip({ images, onImageClick }: { images: string[]; onImageClick: (index: number) => void }) {
  if (!images.length) return null;
  const visible = images.slice(0, 4);
  const remaining = images.length - 4;

  return <div className="flex flex-col gap-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Photos · {images.length}</p>
    <div className="flex flex-wrap gap-2">
      {visible.map((url, index) => {
        const showOverlay = index === 3 && remaining > 0;
        return <button key={`${url}-${index}`} type="button" onClick={() => onImageClick(index)} aria-label={`View photo ${index + 1}`} className="group relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-muted">
          <img src={url} alt={`Photo ${index + 1}`} className={`h-full w-full object-cover transition group-hover:brightness-90 ${showOverlay ? "brightness-50" : ""}`} />
          {index === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">Cover</span>}
          {showOverlay && <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">+{remaining}</span>}
        </button>;
      })}
    </div>
  </div>;
}

function VideoCard({ label, fileUrl, youtubeUrl }: { label: string; fileUrl?: string; youtubeUrl?: string }) {
  const videoId = getYouTubeVideoId(youtubeUrl);
  const items = [
    ...(fileUrl ? [{ href: fileUrl, thumbnail: null as string | null, isYoutube: false }] : []),
    ...(youtubeUrl ? [{ href: youtubeUrl, thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null, isYoutube: true }] : []),
  ];
  if (!items.length) return null;

  return <div className="flex flex-col gap-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <div className="flex flex-wrap gap-3">
      {items.map(({ href, thumbnail, isYoutube }, index) => <a key={`${href}-${index}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${label}${isYoutube ? " on YouTube" : ""}`} className="group relative flex h-[88px] w-[156px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-900 shadow-sm transition hover:shadow-md">
        {thumbnail ? <img src={thumbnail} alt={label} className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-60" /> : <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />}
        <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110 group-hover:bg-white"><Play size={16} className="ml-0.5 text-gray-900" /></span>
        {isYoutube && <span className="absolute bottom-1.5 right-1.5 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">YT</span>}
      </a>)}
    </div>
  </div>;
}

function BrochureCard({ url }: { url: string }) {
  return <div className="flex flex-col gap-2">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brochure</p>
    <div className="flex items-center gap-4 rounded-xl border bg-muted/40 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50"><FileText size={18} className="text-red-500" /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">PDF document</p><p className="text-xs text-muted-foreground">Project brochure</p></div>
      <div className="flex shrink-0 gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:border-primary hover:text-primary"><ExternalLink size={12} />View</a>
        <a href={url} download className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm"><Download size={12} />Download</a>
      </div>
    </div>
  </div>;
}

export default function ListingMediaSection({ images = [], onImageClick, videoUrl, ytVideoUrl, reelUrl, ytReelUrl, brochureUrl }: {
  images?: string[];
  onImageClick: (index: number) => void;
  videoUrl?: string;
  ytVideoUrl?: string;
  reelUrl?: string;
  ytReelUrl?: string;
  brochureUrl?: string;
}) {
  const hasMedia = images.length > 0 || videoUrl || ytVideoUrl || reelUrl || ytReelUrl || brochureUrl;
  if (!hasMedia) return null;

  return <section className="rounded-xl border bg-card p-5">
    <div className="mb-4 flex items-center gap-2"><Film size={16} className="text-primary" /><h2 className="text-base font-bold">Media</h2></div>
    <div className="flex flex-col gap-5">
      <ImageStrip images={images} onImageClick={onImageClick} />
      <VideoCard label="Video" fileUrl={videoUrl} youtubeUrl={ytVideoUrl} />
      <VideoCard label="Reel" fileUrl={reelUrl} youtubeUrl={ytReelUrl} />
      {brochureUrl && <BrochureCard url={brochureUrl} />}
    </div>
  </section>;
}
