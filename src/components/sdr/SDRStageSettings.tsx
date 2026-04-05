import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GripVertical, Plus, Trash2, Settings2, Shield, Wand2 } from "lucide-react";
import { useSDRPipelineStages, type SDRPipelineStage } from "@/hooks/useSDRPipelineStages";
import { toast } from "sonner";
import slugify from "slugify";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SDRStageSettingsProps {
  campaignId?: string | null;
}

const PROTECTED_KEYS = ["enrolled", "converted"];

function SortableStageRow({
  stage,
  onEdit,
  onDelete,
}: {
  stage: SDRPipelineStage;
  onEdit: (s: SDRPipelineStage) => void;
  onDelete: (s: SDRPipelineStage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 group transition-colors"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
      </button>
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getColorValue(stage.color) }} />
      <span className="text-sm font-medium flex-1">{stage.label}</span>
      <span className="text-[11px] font-mono text-muted-foreground">{stage.key}</span>
      {stage.is_terminal && <Badge variant="outline" className="text-[10px]">Final</Badge>}
      {stage.is_negative && <Badge variant="destructive" className="text-[10px]">Negativo</Badge>}
      {PROTECTED_KEYS.includes(stage.key) && <Shield className="h-3 w-3 text-muted-foreground/50" />}
      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => onEdit(stage)}>
        <Settings2 className="h-3 w-3" />
      </Button>
      {!PROTECTED_KEYS.includes(stage.key) && (
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDelete(stage)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function SDRStageSettings({ campaignId }: SDRStageSettingsProps) {
  const { stages, createStage, updateStage, deleteStage, reorderStages, seedDefaults, isLoading } = useSDRPipelineStages(campaignId);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("gray-500");
  const [editingStage, setEditingStage] = useState<SDRPipelineStage | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editTerminal, setEditTerminal] = useState(false);
  const [editNegative, setEditNegative] = useState(false);
  const [localStages, setLocalStages] = useState<SDRPipelineStage[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Sync local stages with query data
  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  // Auto-seed if no stages exist
  useEffect(() => {
    if (!isLoading && stages.length === 0 && !seeded && !seedDefaults.isPending) {
      setSeeded(true);
      seedDefaults.mutate(campaignId ?? undefined);
    }
  }, [isLoading, stages.length, seeded, campaignId, seedDefaults]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const COLORS = [
    "blue-500", "indigo-500", "violet-500", "purple-500",
    "amber-500", "orange-500", "emerald-500", "green-600",
    "red-500", "pink-500", "cyan-500", "gray-500",
  ];

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localStages.findIndex((s) => s.id === active.id);
    const newIndex = localStages.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(localStages, oldIndex, newIndex);
    setLocalStages(reordered);
    reorderStages.mutate(reordered.map((s) => s.id));
  }, [localStages, reorderStages]);

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    const key = slugify(newLabel, { lower: true, strict: true });
    createStage.mutate(
      { key, label: newLabel, position: localStages.length, color: newColor, campaign_id: campaignId },
      { onSuccess: () => { setShowAdd(false); setNewLabel(""); setNewColor("gray-500"); } }
    );
  };

  const handleEdit = () => {
    if (!editingStage || !editLabel.trim()) return;
    updateStage.mutate(
      { id: editingStage.id, label: editLabel, color: editColor, is_terminal: editTerminal, is_negative: editNegative },
      { onSuccess: () => setEditingStage(null) }
    );
  };

  const handleDelete = (stage: SDRPipelineStage) => {
    if (PROTECTED_KEYS.includes(stage.key)) {
      toast.error(`A fase "${stage.label}" é obrigatória e não pode ser eliminada.`);
      return;
    }
    deleteStage.mutate(stage.id);
  };

  const openEdit = (s: SDRPipelineStage) => {
    setEditingStage(s);
    setEditLabel(s.label);
    setEditColor(s.color);
    setEditTerminal(s.is_terminal);
    setEditNegative(s.is_negative);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Fases do Pipeline ({localStages.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            {localStages.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => seedDefaults.mutate(campaignId ?? undefined)}
                disabled={seedDefaults.isPending}
              >
                <Wand2 className="h-3 w-3 mr-1" />
                Gerar padrão
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
              <Plus className="h-3 w-3 mr-1" /> Nova Fase
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {localStages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">Nenhuma fase configurada.</p>
              <Button
                variant="outline"
                onClick={() => seedDefaults.mutate(campaignId ?? undefined)}
                disabled={seedDefaults.isPending}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar fases padrão
              </Button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localStages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1">
                  {localStages.map((stage) => (
                    <SortableStageRow
                      key={stage.id}
                      stage={stage}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Fase</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: Qualificação" />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${c === newColor ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: getColorValue(c) }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!newLabel.trim() || createStage.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Fase</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`h-6 w-6 rounded-full border-2 transition-all ${c === editColor ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: getColorValue(c) }}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={editTerminal} onCheckedChange={setEditTerminal} />
                <Label className="text-sm">Fase final</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editNegative} onCheckedChange={setEditNegative} />
                <Label className="text-sm">Negativa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStage(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={!editLabel.trim() || updateStage.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getColorValue(color: string): string {
  const map: Record<string, string> = {
    "blue-500": "#3b82f6", "indigo-500": "#6366f1", "violet-500": "#8b5cf6",
    "purple-500": "#a855f7", "amber-500": "#f59e0b", "orange-500": "#f97316",
    "emerald-500": "#10b981", "green-600": "#16a34a", "red-500": "#ef4444",
    "pink-500": "#ec4899", "cyan-500": "#06b6d4", "gray-500": "#6b7280",
  };
  return map[color] || "#6b7280";
}
