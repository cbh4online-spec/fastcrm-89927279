import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TicketAISuggestButtonProps {
  ticketId: string;
  workspaceId: string;
  onSuggestion: (text: string) => void;
}

export function TicketAISuggestButton({ ticketId, workspaceId, onSuggestion }: TicketAISuggestButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ticket-ai-reply", {
        body: { ticket_id: ticketId, workspace_id: workspaceId, mode: "suggest" },
      });
      if (error) throw error;
      if (data?.reply) {
        onSuggestion(data.reply);
        toast.success("Sugestão de resposta gerada");
      } else {
        toast.error("Sem resposta da IA");
      }
    } catch (e: any) {
      if (e?.message?.includes("429")) {
        toast.error("Limite de pedidos excedido. Tente novamente em breve.");
      } else if (e?.message?.includes("402")) {
        toast.error("Créditos de IA esgotados. Adicione créditos nas definições.");
      } else {
        toast.error("Erro ao gerar sugestão IA");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30"
      onClick={handleSuggest}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      Sugerir com IA
    </Button>
  );
}
