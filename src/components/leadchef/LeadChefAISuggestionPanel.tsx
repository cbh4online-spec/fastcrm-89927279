import { Sparkles, Loader2, RefreshCcw, MessageSquare, Phone, Mail, Users, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLeadChefAISuggestion, useMarkSuggestionUsed, type AISuggestion } from "@/hooks/leadchef/useLeadChefAISuggestion";
import { copyToClipboard, buildWhatsAppHref } from "@/utils/leadchef/contact";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  leadId: string;
  leadPhone?: string | null;
  className?: string;
}

const CHANNEL_ICON = {
  whatsapp: MessageSquare,
  phone: Phone,
  email: Mail,
  in_person: Users,
} as const;

const URGENCY_TONE: Record<string, string> = {
  high: "bg-red-500/10 text-red-700 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
};

export function LeadChefAISuggestionPanel({ leadId, leadPhone, className }: Props) {
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const generate = useLeadChefAISuggestion();
  const markUsed = useMarkSuggestionUsed();

  async function handleGenerate(force = false) {
    const data = await generate.mutateAsync({ leadId, forceRefresh: force });
    if (!data.fallback) setSuggestion(data);
  }

  async function handleCopy() {
    if (!suggestion) return;
    await copyToClipboard(suggestion.message_draft);
    toast.success("Mensagem copiada");
    if (suggestion.suggestion_id) markUsed.mutate(suggestion.suggestion_id);
  }

  function handleSendWhatsApp() {
    if (!suggestion || !leadPhone) return;
    const href = buildWhatsAppHref(leadPhone, suggestion.message_draft);
    window.open(href, "_blank", "noopener,noreferrer");
    if (suggestion.suggestion_id) markUsed.mutate(suggestion.suggestion_id);
  }

  const Icon = suggestion ? CHANNEL_ICON[suggestion.channel] ?? Sparkles : Sparkles;

  return (
    <div className={cn("rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Sugestão IA</p>
            <p className="text-xs text-slate-500">Próxima ação recomendada</p>
          </div>
        </div>
        {suggestion && (
          <button
            onClick={() => handleGenerate(true)}
            disabled={generate.isPending}
            className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center text-slate-600"
            title="Regenerar"
          >
            <RefreshCcw className={cn("h-3.5 w-3.5", generate.isPending && "animate-spin")} />
          </button>
        )}
      </div>

      {!suggestion && (
        <Button
          onClick={() => handleGenerate(false)}
          disabled={generate.isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          size="sm"
        >
          {generate.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> A pensar...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Sugerir próxima ação</>
          )}
        </Button>
      )}

      {suggestion && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">{suggestion.action}</span>
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", URGENCY_TONE[suggestion.urgency])}>
              {suggestion.urgency === "high" ? "Urgente" : suggestion.urgency === "medium" ? "Média" : "Baixa"}
            </span>
          </div>
          <p className="text-xs text-slate-600 italic">{suggestion.reasoning}</p>
          <div className="rounded-xl bg-white border border-slate-200 p-3">
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{suggestion.message_draft}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCopy} variant="outline" size="sm" className="flex-1">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Copiar mensagem
            </Button>
            {suggestion.channel === "whatsapp" && leadPhone && (
              <Button onClick={handleSendWhatsApp} size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Abrir WhatsApp
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
