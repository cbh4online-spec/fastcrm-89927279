import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  videoUrl?: string | null;
  productName: string;
  promoLabel?: string;
}

export function OfferProductGallery({ images, videoUrl, productName, promoLabel }: Props) {
  const [selected, setSelected] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const total = images.length;
  const current = images[selected];

  const prev = () => setSelected((s) => (total ? (s - 1 + total) % total : 0));
  const next = () => setSelected((s) => (total ? (s + 1) % total : 0));

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-muted">
        {promoLabel && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {promoLabel}
          </span>
        )}
        {showVideo && videoUrl ? (
          <video src={videoUrl} controls autoPlay className="h-full w-full object-cover" />
        ) : current ? (
          <img
            src={current}
            alt={productName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Sem imagem
          </div>
        )}

        {total > 1 && !showVideo && (
          <>
            <button
              type="button"
              aria-label="Imagem anterior"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-sm hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Imagem seguinte"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow-sm hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {(total > 1 || videoUrl) && (
        <div className="flex gap-2 overflow-x-auto">
          {videoUrl && (
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              aria-label="Ver vídeo"
              className={cn(
                "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted",
                showVideo && "ring-2 ring-primary",
              )}
            >
              <Play className="h-5 w-5" />
            </button>
          )}
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => {
                setShowVideo(false);
                setSelected(i);
              }}
              aria-label={`Imagem ${i + 1}`}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted",
                selected === i && !showVideo && "ring-2 ring-primary",
              )}
            >
              <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
