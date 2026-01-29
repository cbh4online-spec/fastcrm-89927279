/**
 * Conversation Objectives Tab
 * List of objectives with drag-and-drop reordering
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  Target,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useConversationObjectives } from "@/hooks/useConversationObjectives";
import { ConversationObjectiveForm } from "./ConversationObjectiveForm";
import type { Database } from "@/integrations/supabase/types";

type ConversationObjective = Database["public"]["Tables"]["conversation_objectives"]["Row"];

export function ConversationObjectivesTab() {
  const {
    objectives,
    isLoading,
    toggleActive,
    deleteObjective,
    reorderObjectives,
    isDeleting,
  } = useConversationObjectives();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<ConversationObjective | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (objective: ConversationObjective) => {
    setEditingObjective(objective);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingObjective(null);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingObjective(null);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteObjective(deleteId);
      setDeleteId(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newOrder = [...objectives];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    await reorderObjectives(newOrder.map((o) => o.id));
  };

  const handleMoveDown = async (index: number) => {
    if (index === objectives.length - 1) return;
    const newOrder = [...objectives];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    await reorderObjectives(newOrder.map((o) => o.id));
  };

  const getCrmEntityLabel = (entity: string) => {
    const labels: Record<string, string> = {
      lead: "Lead",
      contact: "Contacto",
      opportunity: "Oportunidade",
    };
    return labels[entity] || entity;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objetivos de Conversa
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define o que a IA deve recolher durante conversas e mapeia para o CRM
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Objetivo
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p>
                Os objetivos são recolhidos pela IA durante as conversas, seguindo a ordem definida.
                Use as setas para reordenar a prioridade de recolha.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectives List */}
      {objectives.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              Nenhum objetivo configurado
            </h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Crie objetivos para a IA recolher informações dos leads
            </p>
            <Button onClick={handleCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Objetivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {objectives.map((objective, index) => (
            <Card
              key={objective.id}
              className={`transition-all ${
                !objective.is_active ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Drag Handle & Position */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <span className="text-sm font-medium text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">
                        {objective.objective_name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {getCrmEntityLabel(objective.crm_entity)}.{objective.crm_field_to_update}
                      </Badge>
                      {objective.is_required && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    {objective.objective_description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {objective.objective_description}
                      </p>
                    )}
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === objectives.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Toggle Active */}
                  <Switch
                    checked={objective.is_active}
                    onCheckedChange={(checked) =>
                      toggleActive({ id: objective.id, isActive: checked })
                    }
                  />

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(objective)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(objective.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ConversationObjectiveForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        objective={editingObjective}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Objetivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar este objetivo? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "A eliminar..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
