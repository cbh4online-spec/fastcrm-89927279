import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SmartLead } from "@/hooks/useSmartLeads";
import { useUpdateLead } from "@/hooks/useLeads";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useDroppable } from "@dnd-kit/core";
import { Flame, Thermometer, Snowflake, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Skeleton from "react-loading-skeleton";
import { SkeletonTheme } from "@/components/ui/SkeletonTheme";

type GroupByField = "status" | "ai_temperature" | "lead_type";

interface KanbanColumn {
  key: string;
  label: string;
  color: string;
  icon?: React.ReactNode;
}

const STATUS_COLUMNS: KanbanColumn[] = [
  { key: "new", label: "Novo", color: "bg-blue-500/10 border-blue-500/30" },
  { key: "in_progress", label: "Em Progresso", color: "bg-orange-500/10 border-orange-500/30" },
  { key: "completed", label: "Concluído", color: "bg-green-500/10 border-green-500/30" },
];

const TEMPERATURE_COLUMNS: KanbanColumn[] = [
  { key: "hot", label: "Quente", color: "bg-red-500/10 border-red-500/30", icon: <Flame className="h-4 w-4 text-red-500" /> },
  { key: "warm", label: "Morno", color: "bg-orange-500/10 border-orange-500/30", icon: <Thermometer className="h-4 w-4 text-orange-500" /> },
  { key: "cold", label: "Frio", color: "bg-blue-500/10 border-blue-500/30", icon: <Snowflake className="h-4 w-4 text-blue-500" /> },
  { key: "unknown", label: "Sem Temperatura", color: "bg-muted border-border" },
];

const LEAD_TYPE_COLUMNS: KanbanColumn[] = [
  { key: "person", label: "Pessoa", color: "bg-violet-500/10 border-violet-500/30" },
  { key: "company", label: "Empresa", color: "bg-emerald-500/10 border-emerald-500/30" },
];

function getColumns(groupBy: GroupByField): KanbanColumn[] {
  switch (groupBy) {
    case "status": return STATUS_COLUMNS;
    case "ai_temperature": return TEMPERATURE_COLUMNS;
    case "lead_type": return LEAD_TYPE_COLUMNS;
  }
}

function getLeadGroup(lead: SmartLead, groupBy: GroupByField): string {
  switch (groupBy) {
    case "status": return (lead as any).status || "new";
    case "ai_temperature": return lead.ai_temperature || "unknown";
    case "lead_type": return (lead as any).lead_type || "person";
  }
}

// --- Sortable Lead Card ---
function SortableLeadCard({ lead, onClick }: { lead: SmartLead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const initials = lead.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="group bg-card rounded-md border p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-2.5">
        <div {...attributes} {...listeners} className="mt-0.5 cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        </div>
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-[10px] font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{lead.name}</p>
          {(lead as any).company_name && (
            <p className="text-xs text-muted-foreground truncate">{(lead as any).company_name}</p>
          )}
        </div>
        {lead.lead_score != null && lead.lead_score > 0 && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 shrink-0">
            {lead.lead_score}
          </Badge>
        )}
      </div>
    </div>
  );
}

// --- Droppable Column ---
function DroppableColumn({ col, items, onCardClick }: { col: KanbanColumn; items: SmartLead[]; onCardClick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[280px] max-w-[360px] rounded-lg border flex flex-col transition-colors",
        col.color,
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-inherit">
        <div className="flex items-center gap-2">
          {col.icon}
          <span className="text-sm font-medium">{col.label}</span>
        </div>
        <Badge variant="secondary" className="text-xs h-5 px-1.5">{items.length}</Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        <SortableContext items={items.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {items.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead.id)} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            Arraste leads para aqui
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Component ---
interface LeadsKanbanDnDProps {
  leads: SmartLead[];
  isLoading: boolean;
}

export function LeadsKanbanDnD({ leads, isLoading }: LeadsKanbanDnDProps) {
  const navigate = useNavigate();
  const updateLead = useUpdateLead();
  const [groupBy, setGroupBy] = useState<GroupByField>("status");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const columns = useMemo(() => getColumns(groupBy), [groupBy]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, SmartLead[]> = {};
    for (const col of columns) groups[col.key] = [];
    for (const lead of leads) {
      const group = getLeadGroup(lead, groupBy);
      if (groups[group]) groups[group].push(lead);
      else if (columns.length > 0) groups[columns[columns.length - 1].key]?.push(lead);
    }
    return groups;
  }, [leads, groupBy, columns]);

  const activeLead = useMemo(() => leads.find(l => l.id === activeId), [leads, activeId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const targetColumn = columns.find(c => c.key === String(over.id));
    if (!targetColumn) return;

    const leadId = String(active.id);
    const field = groupBy === "ai_temperature" ? "ai_temperature" : groupBy;
    const value = targetColumn.key === "unknown" ? null : targetColumn.key;

    try {
      await updateLead.mutateAsync({ id: leadId, [field]: value } as any);
      toast.success("Lead movido");
    } catch {
      toast.error("Erro ao mover lead");
    }
  }, [groupBy, updateLead, columns]);

  if (isLoading) {
    return (
      <SkeletonTheme>
        <div className="flex gap-4 p-4 h-full">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 min-w-[280px] space-y-3">
              <Skeleton height={32} width={120} />
              <Skeleton height={80} count={3} className="!rounded-md" />
            </div>
          ))}
        </div>
      </SkeletonTheme>
    );
  }

  return (
    <div className="flex flex-col h-full mt-4">
      <div className="flex items-center gap-3 px-4 mb-4">
        <span className="text-sm text-muted-foreground">Agrupar por:</span>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByField)}>
          <SelectTrigger className="w-[180px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="status">Estado</SelectItem>
            <SelectItem value="ai_temperature">Temperatura</SelectItem>
            <SelectItem value="lead_type">Tipo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-h-[500px]">
            {columns.map((col) => (
              <DroppableColumn
                key={col.key}
                col={col}
                items={groupedLeads[col.key] || []}
                onCardClick={(id) => navigate(`/dashboard/leads/${id}`)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="bg-card rounded-md border p-3 shadow-xl opacity-90 w-[280px]">
                <p className="text-sm font-medium truncate">{activeLead.name}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
