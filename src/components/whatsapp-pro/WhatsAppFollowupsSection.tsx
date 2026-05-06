import { useState } from "react";
import { format, isPast } from "date-fns";
import { pt } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ListChecks,
  Loader2,
  MoreVertical,
  Sparkles,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  useWhatsAppFollowups,
  useUpdateFollowupStatus,
  type WhatsAppFollowup,
} from "@/hooks/useWhatsAppFollowups";

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-700 border-slate-200",
  medium: "bg-blue-500/10 text-blue-700 border-blue-200",
  high: "bg-amber-500/10 text-amber-700 border-amber-200",
  urgent: "bg-rose-500/10 text-rose-700 border-rose-200",
};

const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual",
  inbox_intelligence: "IA Inbox",
  post_appointment: "Pós-reunião",
  no_response: "Sem resposta",
  product_share: "Produto enviado",
  proposal_sent: "Proposta enviada",
  ai_policy: "Política IA",
};

interface Props {
  conversationId?: string | null;
  defaultFilter?: "open" | "today" | "overdue" | "completed" | "all";
}

export function WhatsAppFollowupsSection({
  conversationId,
  defaultFilter = "open",
}: Props) {
  const [filter, setFilter] = useState<typeof defaultFilter>(defaultFilter);
  const navigate = useNavigate();

  const params = (() => {
    if (filter === "open") {
      return { status: ["open", "pending", "in_progress"] as const };
    }
    if (filter === "overdue") return { overdueOnly: true };
    if (filter === "today") {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { status: ["open", "pending", "in_progress"] as const };
    }
    if (filter === "completed") return { status: ["completed", "cancelled", "dismissed"] as const };
    return {};
  })();

  const { data: followupsRaw = [], isLoading } = useWhatsAppFollowups({
    conversation_id: conversationId ?? null,
    status: params.status ? Array.from(params.status) : null,
    overdueOnly: "overdueOnly" in params ? params.overdueOnly : false,
    limit: 200,
  });

  const followups =
    filter === "today"
      ? followupsRaw.filter((f) => {
          if (!f.due_at) return false;
          const d = new Date(f.due_at);
          const end = new Date();
          end.setHours(23, 59, 59, 999);
          return d <= end;
        })
      : followupsRaw;

  const update = useUpdateFollowupStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["open", "today", "overdue", "completed", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="h-8"
          >
            {f === "open" && "Abertos"}
            {f === "today" && "Hoje"}
            {f === "overdue" && "Vencidos"}
            {f === "completed" && "Concluídos"}
            {f === "all" && "Todos"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> A carregar...
        </div>
      ) : followups.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Sem follow-ups pendentes. A equipa está em dia.
        </Card>
      ) : (
        <div className="space-y-2">
          {followups.map((f) => (
            <FollowupRow
              key={f.id}
              followup={f}
              onComplete={() => update.mutate({ id: f.id, status: "completed" })}
              onCancel={() => update.mutate({ id: f.id, status: "cancelled" })}
              onOpenConversation={(cid) =>
                navigate(`/dashboard/inbox?conversationId=${cid}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FollowupRow({
  followup,
  onComplete,
  onCancel,
  onOpenConversation,
}: {
  followup: WhatsAppFollowup;
  onComplete: () => void;
  onCancel: () => void;
  onOpenConversation: (id: string) => void;
}) {
  const overdue =
    !!followup.due_at &&
    isPast(new Date(followup.due_at)) &&
    ["open", "pending", "in_progress"].includes(followup.status);
  const priority = followup.priority ?? "medium";

  return (
    <Card className={cn("p-4 hover:shadow-md transition-shadow", overdue && "border-rose-300/60")}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
          <ListChecks className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm truncate">
              {followup.title || "Follow-up"}
            </h4>
            <Badge variant="outline" className={cn("text-[10px]", PRIORITY_BADGE[priority])}>
              {priority}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {SOURCE_LABEL[followup.source as string] ?? followup.source}
            </Badge>
            {followup.suggested_by_ai && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3" /> IA
              </Badge>
            )}
            {overdue && (
              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-700 border-rose-200">
                <AlertCircle className="h-3 w-3 mr-1" /> Vencido
              </Badge>
            )}
          </div>

          {followup.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {followup.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            {followup.due_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(followup.due_at), "PPP HH:mm", { locale: pt })}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {followup.conversation_id && (
              <DropdownMenuItem onClick={() => onOpenConversation(followup.conversation_id!)}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" /> Abrir conversa
              </DropdownMenuItem>
            )}
            {followup.status !== "completed" && (
              <DropdownMenuItem onClick={onComplete}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Marcar como concluído
              </DropdownMenuItem>
            )}
            {!["cancelled", "completed"].includes(followup.status) && (
              <DropdownMenuItem onClick={onCancel} className="text-rose-600">
                <XCircle className="h-3.5 w-3.5 mr-2" /> Cancelar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
