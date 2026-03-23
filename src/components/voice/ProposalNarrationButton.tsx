import { useState } from "react";
import { Volume2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./AudioPlayer";
import { useProposalNarration, useVoiceSettings } from "@/hooks/useVoice";

interface ProposalNarrationButtonProps {
  proposalId: string;
  compact?: boolean;
}

export function ProposalNarrationButton({
  proposalId,
  compact = false,
}: ProposalNarrationButtonProps) {
  const { data: settings } = useVoiceSettings();
  const { cachedNarration, generateNarration } =
    useProposalNarration(proposalId);
  const [showPlayer, setShowPlayer] = useState(false);

  if (!settings?.proposal_narration_enabled) return null;

  const hasAudio = !!cachedNarration.data?.audio_url;
  const isGenerating = generateNarration.isPending;

  const handleActivate = async () => {
    if (hasAudio) {
      setShowPlayer(true);
    } else {
      const result = await generateNarration.mutateAsync(false);
      if (result.audio_url) setShowPlayer(true);
    }
  };

  if (showPlayer && cachedNarration.data?.audio_url) {
    return (
      <div className="space-y-2">
        <AudioPlayer
          audioUrl={cachedNarration.data.audio_url}
          title="Narração da proposta"
          duration={cachedNarration.data.duration_seconds}
          compact={compact}
          autoPlay
        />
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateNarration.mutate(true)}
            disabled={isGenerating}
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${isGenerating ? "animate-spin" : ""}`}
            />
            Regenerar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPlayer(false)}
          >
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      onClick={handleActivate}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4 mr-2" />
      )}
      {isGenerating
        ? "A gerar narração..."
        : hasAudio
          ? "Ouvir proposta"
          : "Narrar proposta"}
    </Button>
  );
}
