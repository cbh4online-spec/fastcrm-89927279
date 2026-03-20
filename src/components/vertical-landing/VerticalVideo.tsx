import { Play } from "lucide-react";
import type { VerticalConfig } from "@/config/verticalConfigs";

interface Props {
  config: VerticalConfig;
}

function getEmbedUrl(url: string, autoplay?: boolean, muted?: boolean, loop?: boolean): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  if (ytMatch) {
    const params = new URLSearchParams();
    if (autoplay) params.set("autoplay", "1");
    if (muted) params.set("mute", "1");
    if (loop) params.set("loop", "1");
    return `https://www.youtube.com/embed/${ytMatch[1]}?${params.toString()}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const params = new URLSearchParams();
    if (autoplay) params.set("autoplay", "1");
    if (muted) params.set("muted", "1");
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?${params.toString()}`;
  }
  return null;
}

export function VerticalVideo({ config }: Props) {
  const video = config.video_section;
  if (!video?.url) return null;

  const embedUrl = getEmbedUrl(video.url, video.autoplay, video.muted, video.loop);

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-[0.2em] mb-4 block" style={{ color: config.cores.primaria }}>
            Vídeo
          </span>
          {video.caption && (
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              {video.caption}
            </h2>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,8%)]">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full aspect-video"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          ) : (
            <video
              src={video.url}
              controls
              autoPlay={video.autoplay}
              loop={video.loop}
              muted={video.muted}
              className="w-full aspect-video"
            />
          )}
        </div>
      </div>
    </section>
  );
}
