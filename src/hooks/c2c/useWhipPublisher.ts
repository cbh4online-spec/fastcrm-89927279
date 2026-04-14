import { useState, useRef, useCallback } from "react";

interface WhipPublisherState {
  status: "idle" | "connecting" | "live" | "error";
  error: string | null;
}

/**
 * WHIP (WebRTC-HTTP Ingestion Protocol) publisher for Mux.
 * Sends local MediaStream directly to Mux via WebRTC — no OBS needed.
 */
export function useWhipPublisher() {
  const [state, setState] = useState<WhipPublisherState>({ status: "idle", error: null });
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const resourceUrlRef = useRef<string | null>(null);

  const publish = useCallback(async (stream: MediaStream, streamKey: string) => {
    try {
      setState({ status: "connecting", error: null });

      // Cleanup any previous connection
      pcRef.current?.close();

      const pc = new RTCPeerConnection({
        iceServers: [], // Mux WHIP handles ICE via the endpoint
        bundlePolicy: "max-bundle",
      });
      pcRef.current = pc;

      // Add all tracks from the local stream
      stream.getTracks().forEach((track) => {
        pc.addTransceiver(track, { direction: "sendonly" });
      });

      // Create and set local offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering (Mux expects a complete offer)
      await waitForIceGathering(pc);

      const whipUrl = `https://global-live.mux.com/api/v1/whip?token=${streamKey}`;

      const res = await fetch(whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: pc.localDescription!.sdp,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`WHIP error ${res.status}: ${errText || "Failed to connect"}`);
      }

      // Save the resource URL for teardown
      const location = res.headers.get("Location");
      if (location) {
        resourceUrlRef.current = location.startsWith("http")
          ? location
          : `https://global-live.mux.com${location}`;
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setState({ status: "live", error: null });
    } catch (err: any) {
      console.error("WHIP publish error:", err);
      setState({ status: "error", error: err?.message || "Erro ao iniciar streaming" });
      pcRef.current?.close();
      pcRef.current = null;
    }
  }, []);

  const stop = useCallback(async () => {
    // Send DELETE to tear down the WHIP session
    if (resourceUrlRef.current) {
      try {
        await fetch(resourceUrlRef.current, { method: "DELETE" });
      } catch {
        // best effort
      }
      resourceUrlRef.current = null;
    }

    pcRef.current?.close();
    pcRef.current = null;
    setState({ status: "idle", error: null });
  }, []);

  return { ...state, publish, stop };
}

function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, timeoutMs);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}
