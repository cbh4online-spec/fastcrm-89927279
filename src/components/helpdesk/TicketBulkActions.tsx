import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, UserPlus, Flag, CheckCircle } from "lucide-react";
import { useState } from "react";
import type { TicketPriority, TicketStatus } from "@/hooks/useHelpdeskTickets";

interface TicketBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkUpdate: (updates: { status?: TicketStatus; priority?: TicketPriority; assigned_to?: string }) => void;
}

export function TicketBulkActions({
  selectedCount,
  onClearSelection,
  onBulkUpdate,
}: TicketBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20 animate-in slide-in-from-bottom-2">
      <span className="text-sm font-medium">
        {selectedCount} ticket{selectedCount > 1 ? "s" : ""} selecionado{selectedCount > 1 ? "s" : ""}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Select onValueChange={(v) => onBulkUpdate({ priority: v as TicketPriority })}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <Flag className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => onBulkUpdate({ status: "resolved" })}
        >
          <CheckCircle className="h-3 w-3" />
          Resolver
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => onBulkUpdate({ status: "closed" })}
        >
          Fechar
        </Button>

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClearSelection}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
