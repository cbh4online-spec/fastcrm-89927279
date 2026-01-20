import { useState } from "react";
import { ArrowLeft, Check, Edit2, Loader2, Zap, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCreatePipelineStage } from "@/hooks/usePipelineStages";
import { GeneratedPipeline, GeneratedStage } from "@/hooks/useGeneratePipeline";

interface PipelinePreviewCardProps {
  pipeline: GeneratedPipeline;
  onBack: () => void;
  onCreated: () => void;
}

export function PipelinePreviewCard({ pipeline, onBack, onCreated }: PipelinePreviewCardProps) {
  const [stages, setStages] = useState<GeneratedStage[]>(pipeline.stages);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedName, setEditedName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createStageMutation = useCreatePipelineStage();

  const handleEditStart = (index: number, name: string) => {
    setEditingIndex(index);
    setEditedName(name);
  };

  const handleEditSave = (index: number) => {
    if (editedName.trim()) {
      setStages((prev) =>
        prev.map((stage, i) => (i === index ? { ...stage, name: editedName.trim() } : stage))
      );
    }
    setEditingIndex(null);
    setEditedName("");
  };

  const handleEditCancel = () => {
    setEditingIndex(null);
    setEditedName("");
  };

  const handleRemoveStage = (index: number) => {
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePipeline = async () => {
    if (stages.length === 0) {
      toast.error("Adicione pelo menos uma etapa");
      return;
    }

    setIsCreating(true);
    try {
      // Create stages one by one in order
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        await createStageMutation.mutateAsync({
          name: stage.name,
          color: stage.color,
          position: i,
        });
      }

      toast.success("Pipeline criado com sucesso!", {
        description: `${stages.length} etapas adicionadas ao pipeline.`,
      });
      onCreated();
    } catch (error) {
      console.error("Error creating pipeline:", error);
      toast.error("Erro ao criar pipeline", {
        description: "Tente novamente.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getPipelineTypeLabel = (type: string) => {
    switch (type) {
      case "sales":
        return "Pipeline de Vendas";
      case "value_ladder":
        return "Escada de Valor";
      case "funnel":
        return "Funil";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold">{pipeline.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">{pipeline.description}</p>
          <div className="flex gap-2 mt-2 ml-10">
            <Badge variant="secondary">{getPipelineTypeLabel(pipeline.type)}</Badge>
            <Badge variant="outline">{pipeline.industry}</Badge>
          </div>
        </div>
      </div>

      {/* Stages Preview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Etapas do Pipeline
        </h4>
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <div className="flex-1 min-w-0">
                {editingIndex === index ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave(index);
                        if (e.key === "Escape") handleEditCancel();
                      }}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleEditSave(index)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stage.name}</span>
                    <span className="text-xs text-muted-foreground">({stage.probability}%)</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
              </div>
              {editingIndex !== index && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleEditStart(index, stage.name)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveStage(index)}
                  >
                    ×
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Automations */}
      {pipeline.suggestedAutomations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Automações Sugeridas
          </h4>
          <div className="space-y-2">
            {pipeline.suggestedAutomations.map((automation, index) => (
              <div key={index} className="p-3 rounded-lg border bg-muted/50 text-sm">
                <div className="font-medium">{automation.name}</div>
                <p className="text-muted-foreground text-xs mt-1">{automation.description}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Poderá configurar estas automações depois em Definições → Automações
          </p>
        </div>
      )}

      {/* Suggested Fields */}
      {pipeline.suggestedFields.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            Campos Sugeridos
          </h4>
          <div className="flex flex-wrap gap-2">
            {pipeline.suggestedFields.map((field, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {field.name}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Poderá adicionar estes campos em Definições → Campos Personalizados
          </p>
        </div>
      )}

      {/* Explanation */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Análise da IA
        </h4>
        <p className="text-sm text-muted-foreground">{pipeline.explanation}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onBack}>
          Voltar e Editar
        </Button>
        <Button onClick={handleCreatePipeline} disabled={isCreating || stages.length === 0}>
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A criar...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Criar Pipeline
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
