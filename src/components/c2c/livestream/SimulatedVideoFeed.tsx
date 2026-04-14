import { Radio, VideoOff, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  isLive: boolean;
  title: string;
  sellerName?: string;
  thumbnailUrl?: string;
  /** If provided, the component will render this stream instead of requesting getUserMedia */
  stream?: MediaStream | null;
}

/**
 * Visual feed for livestreams.
 * - For the SELLER setup page: receives a `stream` prop with the local camera.
 * - For the VIEWER page: shows thumbnail/placeholder. Never requests getUserMedia.
 * - Fallback: animated gradient + particles when no stream/thumbnail available.
 */
export function SimulatedVideoFeed({ isLive, title, sellerName, thumbnailUrl, stream }: Props) {
  // Live with a provided stream (seller preview or future remote playback)
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

  // Live without stream — thumbnail fallback or animated placeholder
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

        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + (i % 4) * 3,
              height: 4 + (i % 4) * 3,
              background: `rgba(255, 255, 255, ${0.05 + (i % 3) * 0.03})`,
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 13.7) % 100}%`,
            }}
            animate={{
              y: [0, -30 - i * 5, 0],
              x: [0, (i % 2 === 0 ? 15 : -15), 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3,
            }}
          />
        ))}

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

        {/* Center info */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center z-10"
          >
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
            {sellerName && (
              <p className="text-white/50 text-sm mt-1">{sellerName}</p>
            )}
            <div className="mt-4 mx-auto max-w-xs bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-white/70 text-xs text-left">
                Streaming em direto será disponibilizado em breve. Por agora, a transmissão usa um placeholder visual.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Vignette */}
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
