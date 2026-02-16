import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LOADING_MESSAGES = [
  "A analisar a página…",
  "A extrair informações…",
  "A criar copy persuasivo…",
  "A optimizar para conversão…",
  "A gerar imagem temática…",
  "Quase pronto…",
];

interface BioSmartLinkGeneratorProps {
  blockType: string;
  workspaceId: string;
  onGenerated: (data: Record<string, string>) => void;
}

export function BioSmartLinkGenerator({ blockType, workspaceId, onGenerated }: BioSmartLinkGeneratorProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setMsgIndex(0);

    try {
      const { data, error } = await supabase.functions.invoke("bio-smart-link", {
        body: { url: url.trim(), blockType, workspaceId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      onGenerated(data.data);
      toast.success("Conteúdo gerado com IA!");
      setUrl("");
    } catch (e: any) {
      console.error("Smart link error:", e);
      toast.error("Erro ao gerar: " + (e.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 p-3 rounded-xl border border-dashed border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-primary">Smart Link — IA gera tudo</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Cole o URL da página..."
          className="text-xs h-8"
          disabled={loading}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        />
        <Button
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={handleGenerate}
          disabled={loading || !url.trim()}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {loading ? "" : "Gerar"}
        </Button>
      </div>
      {loading && (
        <p className="text-xs text-muted-foreground animate-pulse">{LOADING_MESSAGES[msgIndex]}</p>
      )}
    </div>
  );
}
