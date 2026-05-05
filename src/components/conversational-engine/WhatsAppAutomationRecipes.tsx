import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, AlertOctagon, Loader2, CheckCircle2 } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Recipe {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rule: {
    name: string;
    description: string;
    priority: number;
    match_intents?: string[];
    match_sentiments?: string[];
    match_channels?: string[];
    add_tags?: string[];
    set_priority?: "high" | "medium" | "low";
    notify_user?: boolean;
    assignment_strategy: "least_busy" | "round_robin" | "commercial_profile" | "specific_user";
    assign_to_profile?: string | null;
  };
}

const RECIPES: Recipe[] = [
  {
    key: "recipe_price_request",
    name: "Lead pediu preço",
    description:
      "Quando a IA deteta intenção de preço, marca como alta prioridade, etiqueta como lead quente e atribui ao SDR menos ocupado.",
    icon: <Sparkles className="h-5 w-5 text-emerald-600" />,
    rule: {
      name: "Lead pediu preço",
      description: "Receita pré-construída — atua quando a IA classifica intent=price_request ou buying_signal",
      priority: 200,
      match_intents: ["price_request", "buying_signal"],
      match_channels: ["whatsapp"],
      add_tags: ["lead-quente", "preço-pedido"],
      set_priority: "high",
      notify_user: true,
      assignment_strategy: "least_busy",
      assign_to_profile: null,
    },
  },
  {
    key: "recipe_meeting_request",
    name: "Quer reunir",
    description:
      "Quando o cliente pede reunião, prioriza, etiqueta e atribui ao perfil comercial.",
    icon: <Clock className="h-5 w-5 text-blue-600" />,
    rule: {
      name: "Cliente quer reunir",
      description: "Receita pré-construída — atua quando a IA classifica intent=meeting_request",
      priority: 190,
      match_intents: ["meeting_request"],
      match_channels: ["whatsapp"],
      add_tags: ["reunião"],
      set_priority: "high",
      notify_user: true,
      assignment_strategy: "commercial_profile",
      assign_to_profile: "vendedor",
    },
  },
  {
    key: "recipe_complaint",
    name: "Cliente insatisfeito",
    description:
      "Sentimento negativo ou reclamação — escala para gestor, marca como crítica e notifica.",
    icon: <AlertOctagon className="h-5 w-5 text-red-600" />,
    rule: {
      name: "Cliente insatisfeito",
      description: "Receita pré-construída — atua quando a IA deteta sentimento negativo ou complaint",
      priority: 180,
      match_intents: ["complaint"],
      match_sentiments: ["negative"],
      match_channels: ["whatsapp"],
      add_tags: ["reclamação", "urgente"],
      set_priority: "high",
      notify_user: true,
      assignment_strategy: "commercial_profile",
      assign_to_profile: "gestor",
    },
  },
];

export function WhatsAppAutomationRecipes() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const [applying, setApplying] = useState<string | null>(null);

  // Carregar regras existentes para detetar quais receitas já estão aplicadas
  const { data: existingRules } = useQuery({
    queryKey: ["routing-rules-recipes", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data } = await supabase
        .from("conversation_routing_rules" as any)
        .select("name")
        .eq("workspace_id", currentWorkspace.id);
      return (data ?? []).map((r: any) => r.name as string);
    },
    enabled: !!currentWorkspace?.id,
  });

  const applyRecipe = async (recipe: Recipe) => {
    if (!currentWorkspace?.id) return;
    setApplying(recipe.key);
    try {
      const { error } = await supabase.from("conversation_routing_rules" as any).insert({
        workspace_id: currentWorkspace.id,
        ...recipe.rule,
        is_active: true,
      });
      if (error) throw error;
      toast.success(`Receita "${recipe.name}" aplicada`);
      qc.invalidateQueries({ queryKey: ["routing-rules-recipes"] });
      qc.invalidateQueries({ queryKey: ["conversation-routing-rules"] });
    } catch (e) {
      toast.error(`Falha a aplicar: ${(e as Error).message}`);
    } finally {
      setApplying(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Receitas prontas de automação</CardTitle>
        <CardDescription>Aplique automações WhatsApp validadas com 1 clique.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {RECIPES.map((recipe) => {
          const applied = existingRules?.includes(recipe.rule.name);
          return (
            <div key={recipe.key} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="mt-0.5">{recipe.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{recipe.name}</span>
                  {applied && (
                    <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aplicada
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{recipe.description}</p>
              </div>
              <Button
                size="sm"
                variant={applied ? "outline" : "default"}
                disabled={applied || applying === recipe.key}
                onClick={() => applyRecipe(recipe)}
              >
                {applying === recipe.key ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : applied ? (
                  "Aplicada"
                ) : (
                  "Aplicar"
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
