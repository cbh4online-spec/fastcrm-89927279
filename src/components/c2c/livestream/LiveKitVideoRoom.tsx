import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoTrack,
  useRemoteParticipants,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent } from "livekit-client";
import { Radio, VideoOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  token: string | null;
  serverUrl: string;
  isPublisher: boolean;
  isLive: boolean;
  title: string;
  sellerName?: string;
  thumbnailUrl?: string;
  onViewerCountChange?: (count: number) => void;
}

export function LiveKitVideoRoom({
  token,
  serverUrl,
  isPublisher,
  isLive,
  title,
  sellerName,
  thumbnailUrl,
  onViewerCountChange,
}: Props) {
  if (!token || !isLive) {
    return <PlaceholderFeed isLive={isLive} title={title} sellerName={sellerName} thumbnailUrl={thumbnailUrl} />;
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={isPublisher}
      audio={isPublisher}
      className="w-full h-full"
      onConnected={() => console.log("[LiveKit] Connected")}
      onDisconnected={() => console.log("[LiveKit] Disconnected")}
    >
      <VideoStage
        isPublisher={isPublisher}
        title={title}
        sellerName={sellerName}
        thumbnailUrl={thumbnailUrl}
        onViewerCountChange={onViewerCountChange}
      />
    </LiveKitRoom>
  );
}

function VideoStage({
  isPublisher,
  title,
  sellerName,
  thumbnailUrl,
  onViewerCountChange,
}: {
  isPublisher: boolean;
  title: string;
  sellerName?: string;
  thumbnailUrl?: string;
  onViewerCountChange?: (count: number) => void;
}) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: !isPublisher }
  );

  const remoteParticipants = useRemoteParticipants();

  useEffect(() => {
    onViewerCountChange?.(remoteParticipants.length);
  }, [remoteParticipants.length, onViewerCountChange]);

  // Find the publisher's camera track
  const videoTrack = tracks.find(
    (t) =>
      t.source === Track.Source.Camera &&
      t.publication?.track &&
      (isPublisher
        ? t.participant.isLocal
        : !t.participant.isLocal)
  );

  if (!videoTrack?.publication?.track) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-white/30 animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">A conectar ao vídeo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black">
      <VideoTrack
        trackRef={videoTrack}
        className="w-full h-full object-cover"
        style={isPublisher ? { transform: "scaleX(-1)" } : undefined}
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

function PlaceholderFeed({
  isLive,
  title,
  sellerName,
  thumbnailUrl,
}: {
  isLive: boolean;
  title: string;
  sellerName?: string;
  thumbnailUrl?: string;
}) {
  if (isLive) {
    return (
      <div className="w-full h-full relative overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
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
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-white/40 animate-spin mx-auto mb-4" />
            <p className="text-white font-bold text-xl">{title}</p>
            {sellerName && <p className="text-white/50 text-sm mt-1">{sellerName}</p>}
            <p className="text-white/40 text-xs mt-3">A conectar à sala...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="text-center">
        <VideoOff className="h-16 w-16 text-white/15 mx-auto mb-4" />
        <p className="text-white/40 text-sm">Transmissão não disponível</p>
      </div>
    </div>
  );
}
