import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Target, 
  Clock, 
  FileText, 
  CheckCircle, 
  UserPlus, 
  AlertTriangle, 
  ThumbsUp,
  Settings,
  Zap,
  Play,
  Pencil,
  Copy,
  Info
} from "lucide-react";
import { 
  ALL_AUTOMATION_RECIPES, 
  AutomationRecipe, 
  getRecipesByCategory 
} from "@/data/inboxAutomationRecipes";
import { useAutomationRules, useCreateAutomationRule } from "@/hooks/useAutomations";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare,
  Target,
  Clock,
  FileText,
  CheckCircle,
  UserPlus,
  AlertTriangle,
  ThumbsUp,
};

const CATEGORY_LABELS: Record<AutomationRecipe["category"], string> = {
  inbox: "Inbox",
  sales: "Vendas",
  proposals: "Propostas",
  "follow-up": "Follow-up",
};

interface RecipeCardProps {
  recipe: AutomationRecipe;
  isInstalled: boolean;
  installedRuleId?: string;
  onInstall: (recipe: AutomationRecipe) => void;
  onEdit: (recipe: AutomationRecipe, ruleId: string) => void;
  onDuplicate: (recipe: AutomationRecipe) => void;
}

function RecipeCard({ 
  recipe, 
  isInstalled, 
  installedRuleId,
  onInstall, 
  onEdit, 
  onDuplicate 
}: RecipeCardProps) {
  const Icon = ICON_MAP[recipe.icon] || Zap;

  return (
    <Card className={`relative transition-all ${isInstalled ? "border-primary/50 bg-primary/5" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${recipe.color} text-white`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">{recipe.name}</CardTitle>
              <Badge variant="outline" className="mt-1 text-xs">
                {CATEGORY_LABELS[recipe.category]}
              </Badge>
            </div>
          </div>
          {isInstalled && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Instalado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm">
          {recipe.description}
        </CardDescription>

        {/* Recipe details */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span>Gatilho: <span className="text-foreground">{getTriggerLabel(recipe.trigger)}</span></span>
          </div>
          {recipe.conditions.length > 0 && (
            <div className="flex items-center gap-2">
              <Settings className="h-3 w-3" />
              <span>{recipe.conditions.length} condição(ões)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Play className="h-3 w-3" />
            <span>{recipe.actions.length} ação(ões)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {isInstalled && installedRuleId ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(recipe, installedRuleId)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(recipe)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicar receita</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={() => onInstall(recipe)}
            >
              <Zap className="h-4 w-4 mr-1" />
              Instalar Receita
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getTriggerLabel(trigger: string): string {
  const labels: Record<string, string> = {
    message_received: "Mensagem Recebida",
    first_message_from_lead: "1ª Mensagem do Lead",
    conversation_no_reply: "Sem Resposta",
    conversation_resolved: "Conversa Resolvida",
    conversation_priority_changed: "Prioridade Alterada",
    proposal_paid: "Proposta Paga",
  };
  return labels[trigger] || trigger;
}

interface Props {
  onEditRule?: (ruleId: string) => void;
}

export function AutomationRecipesPanel({ onEditRule }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<AutomationRecipe | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const { data: existingRules } = useAutomationRules();
  const createRule = useCreateAutomationRule();

  // Check which recipes are already installed (by matching name pattern)
  const getInstalledRuleId = (recipeId: string): string | undefined => {
    return existingRules?.find(
      (rule) => rule.description?.includes(`[recipe:${recipeId}]`)
    )?.id;
  };

  const isRecipeInstalled = (recipeId: string): boolean => {
    return !!getInstalledRuleId(recipeId);
  };

  const handleInstallClick = (recipe: AutomationRecipe) => {
    setSelectedRecipe(recipe);
    setInstallDialogOpen(true);
  };

  const handleInstallConfirm = async () => {
    if (!selectedRecipe) return;

    setIsInstalling(true);
    try {
      await createRule.mutateAsync({
        name: selectedRecipe.name,
        description: `${selectedRecipe.description} [recipe:${selectedRecipe.id}]`,
        trigger: selectedRecipe.trigger,
        is_active: false, // Disabled by default
        conditions: selectedRecipe.conditions.map((c, i) => ({
          field_name: c.field_name,
          operator: c.operator,
          value: c.value,
          position: i,
        })),
        actions: selectedRecipe.actions.map((a, i) => ({
          action_type: a.action_type,
          config: a.config,
          position: i,
        })),
      });

      toast.success(`Receita "${selectedRecipe.name}" instalada!`, {
        description: "A receita está desativada. Ative-a nas regras de automação.",
      });
      setInstallDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao instalar receita");
    } finally {
      setIsInstalling(false);
    }
  };

  const handleEdit = (recipe: AutomationRecipe, ruleId: string) => {
    onEditRule?.(ruleId);
  };

  const handleDuplicate = (recipe: AutomationRecipe) => {
    setSelectedRecipe({
      ...recipe,
      id: `${recipe.id}-copy`,
      name: `${recipe.name} (Cópia)`,
    });
    setInstallDialogOpen(true);
  };

  const filteredRecipes = activeCategory === "all"
    ? ALL_AUTOMATION_RECIPES
    : getRecipesByCategory(activeCategory as AutomationRecipe["category"]);

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Receitas de Automação Inbox</p>
            <p className="text-xs text-muted-foreground">
              Receitas pré-configuradas para automatizar tarefas comuns do Inbox. 
              Todas são instaladas <strong>desativadas por defeito</strong> — ativa-as quando estiveres pronto.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Category tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="proposals">Propostas</TabsTrigger>
          <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isInstalled={isRecipeInstalled(recipe.id)}
                installedRuleId={getInstalledRuleId(recipe.id)}
                onInstall={handleInstallClick}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma receita nesta categoria.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Install confirmation dialog */}
      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar Receita</DialogTitle>
            <DialogDescription>
              Vais instalar a receita "{selectedRecipe?.name}". A automação será criada 
              <strong> desativada por defeito</strong> para que possas rever e personalizar antes de ativar.
            </DialogDescription>
          </DialogHeader>

          {selectedRecipe && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Gatilho:</span>
                  <span>{getTriggerLabel(selectedRecipe.trigger)}</span>
                </div>
                
                {selectedRecipe.conditions.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Condições:</span>
                    <ul className="mt-1 ml-6 list-disc text-muted-foreground">
                      {selectedRecipe.conditions.map((c, i) => (
                        <li key={i}>
                          {c.field_name} {c.operator} {c.value || "(vazio)"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-sm">
                  <span className="font-medium">Ações ({selectedRecipe.actions.length}):</span>
                  <ul className="mt-1 ml-6 list-disc text-muted-foreground">
                    {selectedRecipe.actions.map((a, i) => (
                      <li key={i}>{getActionLabel(a.action_type)}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">A receita será instalada desativada.</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInstallConfirm} disabled={isInstalling}>
              {isInstalling ? "A instalar..." : "Instalar Receita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    notify_user: "Notificar Utilizador",
    create_opportunity: "Criar Oportunidade",
    add_tag: "Adicionar Tag",
    create_task: "Criar Tarefa",
    send_template_message: "Enviar Mensagem Template",
    move_opportunity_stage: "Mover Etapa",
    change_lead_status: "Alterar Estado do Lead",
  };
  return labels[actionType] || actionType;
}
