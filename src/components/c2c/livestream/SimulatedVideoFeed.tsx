import { Radio, VideoOff, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface Props {
  isLive: boolean;
  title: string;
  sellerName?: string;
  thumbnailUrl?: string;
  /** Local camera stream for broadcaster */
  stream?: MediaStream | null;
  /** Mux playback ID for HLS streaming */
  playbackId?: string | null;
}

/**
 * Video feed for livestreams.
 * Priority: 1) HLS playback (Mux), 2) local camera stream, 3) placeholder
 */
export function SimulatedVideoFeed({ isLive, title, sellerName, thumbnailUrl, stream, playbackId }: Props) {
  // HLS playback via Mux
  if (isLive && playbackId) {
    return (
      <MuxHlsPlayer
        playbackId={playbackId}
        title={title}
        sellerName={sellerName}
        thumbnailUrl={thumbnailUrl}
      />
    );
  }

  // Local camera stream (broadcaster preview)
  if (isLive && stream) {
    return (
      <div className="w-full h-full relative">
        <video
          ref={(el) => {
            if (el && el.srcObject !== stream) {
              el.srcObject = stream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
          }}
        />
      </div>
    );
  }

  // Live without any stream — animated placeholder
  if (isLive) {
    return (
      <div className="w-full h-full relative overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                "linear-gradient(135deg, #0f3460 0%, #1a1a2e 50%, #16213e 100%)",
                "linear-gradient(135deg, #16213e 0%, #0f3460 50%, #1a1a2e 100%)",
              ],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Audio visualizer bars */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-1 px-8 pb-8 h-32">
          {Array.from({ length: 32 }).map((_, i) => (
            <motion.div
              key={i}
              className="flex-1 max-w-2 rounded-t-full"
              style={{
                background: "linear-gradient(to top, rgba(239, 68, 68, 0.6), rgba(239, 68, 68, 0.1))",
              }}
              animate={{
                height: [
                  `${10 + Math.sin(i * 0.7) * 20}%`,
                  `${30 + Math.cos(i * 0.5) * 40}%`,
                  `${15 + Math.sin(i * 0.9) * 25}%`,
                ],
              }}
              transition={{
                duration: 0.8 + (i % 5) * 0.15,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.05,
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center z-10">
            <motion.div
              className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{
                background: "radial-gradient(circle, rgba(239,68,68,0.3) 0%, rgba(239,68,68,0.05) 70%)",
                boxShadow: "0 0 60px rgba(239,68,68,0.2)",
              }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Radio className="h-10 w-10 text-red-400" />
            </motion.div>
            <p className="text-white font-bold text-xl tracking-tight">{title}</p>
            {sellerName && <p className="text-white/50 text-sm mt-1">{sellerName}</p>}
            <div className="mt-4 mx-auto max-w-xs bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-white/70 text-xs text-left">
                A aguardar o sinal de vídeo do broadcaster...
              </p>
            </div>
          </motion.div>
        </div>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
          }}
        />
      </div>
    );
  }

  // Not live — static placeholder
  return (
    <div className="w-full h-full relative">
      {thumbnailUrl ? (
        <>
          <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <VideoOff className="h-16 w-16 text-white/30" />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="text-center">
            <VideoOff className="h-16 w-16 text-white/15 mx-auto mb-4" />
            <p className="text-white/40 text-sm">Transmissão não disponível</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** HLS Player using hls.js for Mux playback */
function MuxHlsPlayer({
  playbackId,
  title,
  sellerName,
  thumbnailUrl,
}: {
  playbackId: string;
  title: string;
  sellerName?: string;
  thumbnailUrl?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;
  const posterUrl = thumbnailUrl || `https://image.mux.com/${playbackId}/thumbnail.webp?time=0`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(false);
    setLoading(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });
      hlsRef.current = hls;

      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data.type, data.details);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Try to recover
            setTimeout(() => hls.startLoad(), 3000);
          } else {
            setError(true);
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = playbackUrl;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
        video.play().catch(() => {});
      });
      video.addEventListener("error", () => setError(true));
    } else {
      setError(true);
    }
  }, [playbackUrl]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Radio className="h-12 w-12 text-red-400/50 mx-auto mb-3" />
          <p className="text-white/60 text-sm">Não foi possível carregar a transmissão</p>
          <p className="text-white/30 text-xs mt-1">A transmissão pode ainda não ter iniciado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/60 text-sm">A carregar transmissão...</p>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        controls
        poster={posterUrl}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
