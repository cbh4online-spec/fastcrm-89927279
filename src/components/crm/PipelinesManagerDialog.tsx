import { useState } from "react";
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useActivePipeline,
  Pipeline,
} from "@/hooks/usePipelines";
import {
  usePipelineStages,
  useCreatePipelineStage,
  useUpdatePipelineStage,
  useDeletePipelineStage,
  PipelineStage,
} from "@/hooks/usePipelineStages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  Star,
  StarOff,
  GitBranch,
} from "lucide-react";

const defaultColors = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

const pipelineTypes = [
  { value: "sales", label: "Vendas" },
  { value: "value_ladder", label: "Value Ladder" },
  { value: "funnel", label: "Funil" },
  { value: "renewal", label: "Renovações" },
  { value: "onboarding", label: "Onboarding" },
  { value: "custom", label: "Personalizado" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelinesManagerDialog({ open, onOpenChange }: Props) {
  const { data: pipelines = [], isLoading } = usePipelines();
  const { activeId, setActiveId } = useActivePipeline();
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Pipeline | null>(null);

  // Form state
  const [pName, setPName] = useState("");
  const [pType, setPType] = useState("sales");
  const [pDesc, setPDesc] = useState("");
  const [pIsDefault, setPIsDefault] = useState(false);

  const selected = pipelines.find((p) => p.id === selectedId) || pipelines.find((p) => p.id === activeId) || pipelines[0] || null;
  const currentTab = selected?.id;

  const resetForm = () => {
    setPName("");
    setPType("sales");
    setPDesc("");
    setPIsDefault(false);
  };

  const handleCreate = async () => {
    if (!pName.trim()) return;
    const created = await createPipeline.mutateAsync({
      name: pName.trim(),
      type: pType,
      description: pDesc.trim() || undefined,
      is_default: pIsDefault,
    });
    resetForm();
    setShowCreate(false);
    setSelectedId(created.id);
    setActiveId(created.id);
  };

  const handleSetDefault = async (p: Pipeline) => {
    await updatePipeline.mutateAsync({ id: p.id, is_default: !p.is_default });
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await deletePipeline.mutateAsync(pendingDelete.id);
    setPendingDelete(null);
    if (selectedId === pendingDelete.id) setSelectedId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[820px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Gestão de Pipelines
            </DialogTitle>
            <DialogDescription>
              Crie e configure múltiplos pipelines para diferentes processos comerciais.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Lista de pipelines */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {pipelines.length} pipeline{pipelines.length === 1 ? "" : "s"}
              </span>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Novo pipeline
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pipelines.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="mb-3">Ainda não tem pipelines.</p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Criar primeiro pipeline
                </Button>
              </div>
            ) : (
              <Tabs
                value={currentTab}
                onValueChange={(v) => setSelectedId(v)}
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="w-full justify-start h-auto flex-wrap">
                  {pipelines.map((p) => (
                    <TabsTrigger key={p.id} value={p.id} className="gap-1.5">
                      {p.name}
                      {p.is_default && <Star className="h-3 w-3 fill-current" />}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {pipelines.map((p) => (
                  <TabsContent key={p.id} value={p.id} className="flex-1 overflow-y-auto mt-3 space-y-4">
                    <PipelineEditPanel
                      pipeline={p}
                      onSetDefault={() => handleSetDefault(p)}
                      onDelete={() => setPendingDelete(p)}
                      onUpdate={(updates) => updatePipeline.mutate({ id: p.id, ...updates })}
                      onSetActive={() => { setActiveId(p.id); }}
                      isActive={activeId === p.id}
                    />
                    <PipelineStagesEditor pipelineId={p.id} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criar pipeline */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Novo Pipeline</DialogTitle>
            <DialogDescription>
              Defina um nome, tipo e descrição. Pode editar mais detalhes depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex.: Vendas B2B"
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={pType} onValueChange={setPType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipelineTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Para que serve este pipeline?"
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">Definir como pipeline padrão</Label>
                <p className="text-xs text-muted-foreground">
                  As novas oportunidades serão criadas neste pipeline por defeito.
                </p>
              </div>
              <Switch checked={pIsDefault} onCheckedChange={setPIsDefault} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!pName.trim() || createPipeline.isPending}>
              {createPipeline.isPending ? "A criar..." : "Criar pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminação */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pipeline?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" será removido. Esta ação não pode ser desfeita.
              As oportunidades associadas ficarão sem pipeline (mas continuarão acessíveis).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ----------------- Painel de edição de um pipeline ------------------- */
interface PanelProps {
  pipeline: Pipeline;
  isActive: boolean;
  onSetDefault: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Pipeline>) => void;
  onSetActive: () => void;
}

function PipelineEditPanel({ pipeline, isActive, onSetDefault, onDelete, onUpdate, onSetActive }: PanelProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pipeline.name);
  const [type, setType] = useState(pipeline.type || "sales");
  const [description, setDescription] = useState(pipeline.description || "");

  const handleSave = () => {
    onUpdate({ name: name.trim(), type, description: description.trim() || null });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pipelineTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Descrição" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{pipeline.name}</h3>
                <Badge variant="outline" className="text-[10px]">
                  {pipelineTypes.find((t) => t.value === pipeline.type)?.label || pipeline.type}
                </Badge>
                {pipeline.is_default && (
                  <Badge variant="secondary" className="text-[10px]">padrão</Badge>
                )}
                {isActive && (
                  <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20" variant="outline">
                    em uso
                  </Badge>
                )}
              </div>
              {pipeline.description && (
                <p className="text-sm text-muted-foreground mt-1">{pipeline.description}</p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave}>Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(pipeline.name); setType(pipeline.type || "sales"); setDescription(pipeline.description || ""); }}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              {!isActive && (
                <Button size="sm" variant="outline" onClick={onSetActive}>
                  Selecionar
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onSetDefault} title={pipeline.is_default ? "Remover como padrão" : "Definir como padrão"}>
                {pipeline.is_default ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------- Editor de stages do pipeline ------------------- */
function PipelineStagesEditor({ pipelineId }: { pipelineId: string }) {
  const { data: stages = [], isLoading } = usePipelineStages(pipelineId);
  const createStage = useCreatePipelineStage();
  const updateStage = useUpdatePipelineStage();
  const deleteStage = useDeletePipelineStage();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(defaultColors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editDays, setEditDays] = useState(14);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createStage.mutateAsync({
      name: newName.trim(),
      color: newColor,
      pipeline_id: pipelineId,
    });
    setNewName("");
    setNewColor(defaultColors[(stages.length + 1) % defaultColors.length]);
  };

  const startEdit = (s: PipelineStage) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditColor(s.color);
    setEditDays(s.expected_days ?? 14);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateStage.mutateAsync({
      id: editingId,
      name: editName.trim(),
      color: editColor,
      expected_days: editDays,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Fases ({stages.length})</h4>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
          Sem fases ainda. Adicione a primeira abaixo.
        </p>
      ) : (
        <div className="space-y-2">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-card border"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              {editingId === stage.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                  />
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={editDays}
                    onChange={(e) => setEditDays(Number(e.target.value) || 14)}
                    className="w-16 h-8 text-center"
                  />
                  <span className="text-xs text-muted-foreground">d</span>
                  <Button size="sm" onClick={saveEdit}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="flex-1 text-sm cursor-pointer hover:text-primary" onClick={() => startEdit(stage)}>
                    {stage.name}
                    <span className="text-xs text-muted-foreground ml-1.5">· {stage.expected_days ?? 14}d</span>
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteStage.mutate(stage.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border-0"
        />
        <Input
          placeholder="Nome da nova fase"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
        />
        <Button onClick={handleCreate} disabled={!newName.trim() || createStage.isPending}>
          <Plus className="w-4 h-4 mr-1.5" /> Adicionar
        </Button>
      </div>
    </div>
  );
}
