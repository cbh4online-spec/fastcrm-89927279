import { useState, useCallback } from "react";
import { useConversation } from "@elevenlabs/react";
import { Mic, MicOff, X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceSettings } from "@/hooks/useVoice";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function VoiceConversationWidget() {
  const { data: settings } = useVoiceSettings();
  const { currentWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const conversation = useConversation({
    onConnect: () => console.log("Voice conversation connected"),
    onDisconnect: () => console.log("Voice conversation disconnected"),
    onMessage: (message) => console.log("Message:", message),
    onError: (error) => {
      console.error("Voice error:", error);
      toast.error("Erro na conversa de voz");
    },
  });

  const startConversation = useCallback(async () => {
    if (!settings?.agent_id) {
      toast.error("Agent ID não configurado nas definições de voz");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await conversation.startSession({
        agentId: settings.agent_id,
        dynamicVariables: {
          workspace_id: currentWorkspace?.id ?? "",
        },
      });
    } catch (error) {
      console.error("Failed to start voice conversation:", error);
      toast.error("Não foi possível iniciar a conversa de voz. Verifique as permissões do microfone.");
    }
  }, [conversation, settings?.agent_id, currentWorkspace?.id]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleMute = useCallback(() => {
    conversation.setVolume({ volume: isMuted ? 1 : 0 });
    setIsMuted(!isMuted);
  }, [conversation, isMuted]);

  if (!settings?.voice_widget_enabled || !settings?.agent_id) return null;

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting";
  const isSpeaking = conversation.isSpeaking;

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-110"
          aria-label="Activar assistente de voz"
        >
          <Mic className="h-6 w-6 text-primary-foreground" />
        </button>
      )}

      {/* Voice panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl bg-card border shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected
                    ? "bg-green-500 animate-pulse"
                    : isConnecting
                      ? "bg-amber-500 animate-pulse"
                      : "bg-muted-foreground"
                )}
              />
              <span className="text-sm font-medium">
                {isConnected
                  ? "Assistente activo"
                  : isConnecting
                    ? "A ligar..."
                    : "Assistente de voz"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                endConversation();
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Voice visualizer */}
          <div className="flex flex-col items-center gap-4 p-6">
            <div
              className={cn(
                "relative h-20 w-20 rounded-full border-4 flex items-center justify-center transition-all duration-300",
                isConnected && isSpeaking
                  ? "border-primary bg-primary/10 scale-110"
                  : isConnected
                    ? "border-green-500 bg-green-500/10"
                    : "border-muted"
              )}
            >
              {isSpeaking ? (
                <div className="flex items-end gap-0.5 h-8">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-primary rounded-full animate-bounce"
                      style={{
                        height: `${Math.random() * 24 + 8}px`,
                        animationDelay: `${i * 100}ms`,
                        animationDuration: "600ms",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Mic
                  className={cn(
                    "h-8 w-8",
                    isConnected
                      ? "text-green-600"
                      : "text-muted-foreground"
                  )}
                />
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {isConnected && isSpeaking
                ? "Assistente a falar..."
                : isConnected
                  ? "Fala agora..."
                  : isConnecting
                    ? "A ligar ao assistente..."
                    : "Clica para iniciar conversa"}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 p-4 border-t">
            {isConnected ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={endConversation}
                  className="gap-2"
                >
                  <MicOff className="h-4 w-4" />
                  Terminar
                </Button>
              </>
            ) : (
              <Button
                onClick={startConversation}
                disabled={isConnecting}
                className="gap-2 w-full"
              >
                {isConnecting ? (
                  <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {isConnecting ? "A ligar..." : "Iniciar conversa"}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
