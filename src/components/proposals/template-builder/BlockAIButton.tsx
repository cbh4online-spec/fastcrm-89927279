import { SectionAIAssistButton } from "../SectionAIAssistButton";
import type { ContentBlock } from "@/types/proposal";

interface BlockAIButtonProps {
  block: ContentBlock;
  templateName: string;
  templateDescription: string;
  onGenerated: (content: Record<string, unknown>) => void;
  isLoading?: boolean;
  onGenerateRequest: (blockType: ContentBlock["type"], blockId: string) => void;
}

export function BlockAIButton({
  block,
  isLoading = false,
  onGenerateRequest,
}: BlockAIButtonProps) {
  return (
    <SectionAIAssistButton
      onClick={() => onGenerateRequest(block.type, block.id)}
      isLoading={isLoading}
      label="IA"
      tooltip="Gerar conteúdo com IA para este bloco"
      size="sm"
      className="h-6 text-[10px] px-2"
    />
  );
}
