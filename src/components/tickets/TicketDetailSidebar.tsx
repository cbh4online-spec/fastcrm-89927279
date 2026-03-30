import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TicketCSATStars } from "@/components/tickets/TicketCSATStars";
import { Clock, User, Building2, Tag, Calendar } from "lucide-react";
import TimeAgo from "react-timeago";

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Progresso",
  waiting_client: "Aguarda Cliente",
  waiting_internal: "Aguarda Interno",
  resolved: "Resolvido",
  closed: "Fechado",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-blue-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

const TYPE_LABELS: Record<string, string> = {
  support: "Suporte",
  commercial: "Comercial",
  technical: "Técnico",
};

interface TicketDetailSidebarProps {
  ticket: any;
  onUpdate: (updates: Record<string, any>) => void;
}

export function TicketDetailSidebar({ ticket, onUpdate }: TicketDetailSidebarProps) {
  const isResolved = ["resolved", "closed"].includes(ticket.status);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Status */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Estado</label>
          <Select value={ticket.status} onValueChange={(v) => onUpdate({ status: v })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
          <Select value={ticket.priority} onValueChange={(v) => onUpdate({ priority: v })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  <span className={PRIORITY_COLORS[k]}>{v}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
          <Badge variant="outline">{TYPE_LABELS[ticket.type] || ticket.type}</Badge>
        </div>

        <Separator />

        {/* SLA */}
        {ticket.sla_deadline && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              SLA
            </label>
            <SLATimer deadline={ticket.sla_deadline} breached={ticket.sla_breached} />
          </div>
        )}

        {/* Tags */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(ticket.tags || []).length === 0 ? (
              <span className="text-xs text-muted-foreground">Sem tags</span>
            ) : (
              (ticket.tags || []).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))
            )}
          </div>
        </div>

        <Separator />

        {/* Dates */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Criado
            </label>
            <p className="text-sm text-foreground"><TimeAgo date={ticket.created_at} /></p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Última atualização</label>
            <p className="text-sm text-foreground"><TimeAgo date={ticket.updated_at} /></p>
          </div>
          {ticket.resolved_at && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Resolvido</label>
              <p className="text-sm text-foreground"><TimeAgo date={ticket.resolved_at} /></p>
            </div>
          )}
        </div>

        {/* CSAT */}
        {isResolved && (
          <>
            <Separator />
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Satisfação do Cliente</label>
              <TicketCSATStars
                rating={ticket.satisfaction_rating}
                onChange={(rating) => onUpdate({ satisfaction_rating: rating })}
              />
            </div>
          </>
        )}

        {/* Source */}
        {ticket.source && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Origem</label>
            <Badge variant="outline" className="text-xs capitalize">{ticket.source}</Badge>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function SLATimer({ deadline, breached }: { deadline: string; breached: boolean }) {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();

  if (breached || diff < 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
        <span className="text-sm font-medium text-red-400">SLA ultrapassado</span>
      </div>
    );
  }

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const isWarning = hours < 1;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
      isWarning ? "bg-amber-500/10 border border-amber-500/20" : "bg-green-500/10 border border-green-500/20"
    }`}>
      <div className={`h-2 w-2 rounded-full ${isWarning ? "bg-amber-400 animate-pulse" : "bg-green-400"}`} />
      <span className={`text-sm font-medium ${isWarning ? "text-amber-400" : "text-green-400"}`}>
        {hours}h {mins}m restantes
      </span>
    </div>
  );
}
