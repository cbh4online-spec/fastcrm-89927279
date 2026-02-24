import { useState } from "react";
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
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, RotateCcw } from "lucide-react";

const defaultColors = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

interface PipelineSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineSettingsDialog({ open, onOpenChange }: PipelineSettingsDialogProps) {
  const { data: stages, isLoading } = usePipelineStages();
  const createStage = useCreatePipelineStage();
  const updateStage = useUpdatePipelineStage();
  const deleteStage = useDeletePipelineStage();

  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(defaultColors[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedColor, setEditedColor] = useState("");
  const [editedExpectedDays, setEditedExpectedDays] = useState(14);

  const handleCreateStage = async () => {
    if (!newStageName.trim()) {
      toast.error("Stage name is required");
      return;
    }
    try {
      await createStage.mutateAsync({
        name: newStageName.trim(),
        color: newStageColor,
      });
      toast.success("Stage created successfully");
      setNewStageName("");
      setNewStageColor(defaultColors[(stages?.length || 0) % defaultColors.length]);
    } catch {
      toast.error("Failed to create stage");
    }
  };

  const handleStartEdit = (stage: PipelineStage) => {
    setEditingId(stage.id);
    setEditedName(stage.name);
    setEditedColor(stage.color);
    setEditedExpectedDays(stage.expected_days ?? 14);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editedName.trim()) return;
    try {
      await updateStage.mutateAsync({
        id: editingId,
        name: editedName.trim(),
        color: editedColor,
        expected_days: editedExpectedDays,
      });
      toast.success("Stage updated successfully");
      setEditingId(null);
    } catch {
      toast.error("Failed to update stage");
    }
  };

  const handleDeleteStage = async (id: string) => {
    try {
      await deleteStage.mutateAsync(id);
      toast.success("Stage deleted successfully");
    } catch (error: any) {
      if (error.message?.includes("violates foreign key constraint")) {
        toast.error("Cannot delete stage with opportunities. Move or delete them first.");
      } else {
        toast.error("Failed to delete stage");
      }
    }
  };

  const handleResetDefaults = async () => {
    if (!stages?.length) return;
    try {
      await Promise.all(
        stages.map((s) => updateStage.mutateAsync({ id: s.id, expected_days: 14 }))
      );
      toast.success("Benchmarks reset to 14 days");
    } catch {
      toast.error("Failed to reset benchmarks");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Pipeline Settings</DialogTitle>
          <DialogDescription>
            Configure your sales pipeline stages and stage benchmarks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stages?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stages yet. Create your first stage below.
            </div>
          ) : (
            <div className="space-y-2">
              {stages?.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />

                  {editingId === stage.id ? (
                    <>
                      <input
                        type="color"
                        value={editedColor}
                        onChange={(e) => setEditedColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={editedExpectedDays}
                          onChange={(e) => setEditedExpectedDays(Number(e.target.value) || 14)}
                          className="w-16 h-8 text-center"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">days</span>
                      </div>
                      <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span
                        className="flex-1 cursor-pointer hover:text-primary"
                        onClick={() => handleStartEdit(stage)}
                      >
                        {stage.name}
                        <span className="text-xs text-muted-foreground ml-1.5">
                          · {stage.expected_days ?? 14}d
                        </span>
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteStage(stage.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add New Stage */}
          <div className="pt-4 border-t border-border">
            <Label className="text-sm font-medium">Add New Stage</Label>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={newStageColor}
                onChange={(e) => setNewStageColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <Input
                placeholder="Stage name"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateStage();
                }}
              />
              <Button
                onClick={handleCreateStage}
                disabled={createStage.isPending || !newStageName.trim()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={handleResetDefaults}
            disabled={!stages?.length}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset benchmarks
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
