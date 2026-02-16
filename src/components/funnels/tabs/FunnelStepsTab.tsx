import { useState } from "react";
import { Plus, Mail, Trash2, Copy, GripVertical, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  useFunnelSteps, useCreateFunnelStep, useDeleteFunnelStep, useUpdateFunnelStep
} from "@/hooks/useFunnels";
import { cn } from "@/lib/utils";
import { FunnelStepEditor } from "../FunnelStepEditor";

const STEP_TYPE_ICONS: Record<string, string> = {
  page: "🏠",
  optin: "📋",
  checkout: "💳",
  thankyou: "✅",
  upsell: "🚀",
};

const STEP_TYPE_COLORS: Record<string, string> = {
  page: "border-l-emerald-500",
  optin: "border-l-blue-500",
  checkout: "border-l-amber-500",
  thankyou: "border-l-violet-500",
  upsell: "border-l-rose-500",
};

interface FunnelStepsTabProps {
  funnelId: string;
}

export function FunnelStepsTab({ funnelId }: FunnelStepsTabProps) {
  const { data: steps = [] } = useFunnelSteps(funnelId);
  const createStep = useCreateFunnelStep();
  const deleteStep = useDeleteFunnelStep();
  const updateStep = useUpdateFunnelStep();

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newStepName, setNewStepName] = useState("");
  const [newStepType, setNewStepType] = useState("page");
  const [stepSubTab, setStepSubTab] = useState("overview");

  const selectedStep = steps.find((s) => s.id === selectedStepId) || steps[0] || null;

  const handleAddStep = async () => {
    if (!newStepName) return;
    await createStep.mutateAsync({
      funnel_id: funnelId,
      name: newStepName,
      step_type: newStepType,
      sort_order: steps.length,
    });
    setAddDialogOpen(false);
    setNewStepName("");
    setNewStepType("page");
  };

  const handleDeleteStep = async (stepId: string) => {
    if (confirm("Tens a certeza que queres eliminar este step?")) {
      await deleteStep.mutateAsync({ id: stepId, funnelId });
      if (selectedStepId === stepId) setSelectedStepId(null);
    }
  };

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Sidebar - Steps list */}
      <div className="w-72 space-y-3 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-emerald-500">✅</span>
          <h3 className="font-semibold text-sm">Funnel Steps</h3>
        </div>

        <div className="space-y-1">
          {steps.map((step, index) => (
            <div key={step.id}>
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:bg-muted/50",
                  STEP_TYPE_COLORS[step.step_type] || "border-l-gray-400",
                  selectedStep?.id === step.id && "bg-muted ring-1 ring-primary/20"
                )}
                onClick={() => setSelectedStepId(step.id)}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{step.name}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="w-0.5 h-4 bg-emerald-400 rounded-full" />
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Step
        </Button>
      </div>

      {/* Main content area */}
      {selectedStep ? (
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{selectedStep.name}</h3>
            <Tabs value={stepSubTab} onValueChange={setStepSubTab}>
              <TabsList className="h-8">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="editor" className="text-xs">Editor</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {stepSubTab === "overview" ? (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex gap-6">
                  {/* Page preview */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        CONTROL
                      </Badge>
                    </div>
                    <div className="w-48 h-64 border rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">
                      {STEP_TYPE_ICONS[selectedStep.step_type]} Pré-visualização
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm">
                        Editar
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Split test placeholder */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
                        <span className="text-2xl">🔀</span>
                      </div>
                      <h4 className="font-medium">Start Split Test</h4>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Optimiza a geração de leads e vendas com testes A/B.
                      </p>
                    </div>
                  </div>

                  {/* Variation placeholder */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        VARIATION
                      </Badge>
                    </div>
                    <div className="w-48 h-64 border-2 border-dashed rounded-lg flex items-center justify-center">
                      <Button variant="link" size="sm">
                        <Plus className="h-3 w-3 mr-1" />
                        Criar variação
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteStep(selectedStep.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Eliminar Step
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-1" />
                    Clonar Step
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <FunnelStepEditor step={selectedStep} />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Seleciona um step para editar
        </div>
      )}

      {/* Add Step Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newStepName} onChange={(e) => setNewStepName(e.target.value)} placeholder="Ex: Checkout" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newStepType} onValueChange={setNewStepType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="page">🏠 Página</SelectItem>
                  <SelectItem value="optin">📋 Opt-in</SelectItem>
                  <SelectItem value="checkout">💳 Checkout</SelectItem>
                  <SelectItem value="thankyou">✅ Thank You</SelectItem>
                  <SelectItem value="upsell">🚀 Upsell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddStep} disabled={!newStepName}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
