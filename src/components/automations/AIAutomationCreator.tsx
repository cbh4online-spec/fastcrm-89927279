import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  Zap,
  Filter,
  Play,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

interface SuggestedAutomation {
  name: string;
  description: string;
  trigger: string;
  triggerDescription: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
    description: string;
  }>;
  actions: Array<{
    type: string;
    description: string;
  }>;
  impact: string;
  confidence: number;
}

const EXAMPLE_PROMPTS = [
  "Quando um cliente ENI não compra há 6 meses, criar tarefa para o responsável",
  "Notificar quando uma proposta está sem resposta há mais de 3 dias",
  "Quando um lead preenche o formulário de formação, enviar email de confirmação",
  "Se um pagamento está em atraso há 7 dias, bloquear crédito e notificar financeiro",
  "Quando a oportunidade atinge €5000, escalar para o gestor comercial",
];

export function AIAutomationCreator() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestedAutomation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Por favor, descreve o que queres automatizar");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuggestion(null);

    try {
      // Simulate AI generation (in production, this would call the Lovable AI edge function)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock AI response based on prompt analysis
      const mockSuggestion = generateMockSuggestion(prompt);
      setSuggestion(mockSuggestion);
    } catch (err) {
      setError("Erro ao gerar sugestão. Tenta novamente.");
      toast.error("Erro ao gerar sugestão de automação");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (!suggestion) return;
    toast.success("Automação adicionada como rascunho!", {
      description: "Revê e personaliza antes de ativar.",
    });
    setSuggestion(null);
    setPrompt("");
  };

  const handleUseExample = (example: string) => {
    setPrompt(example);
    setSuggestion(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Criar Automação com IA</CardTitle>
              <CardDescription>
                Descreve em linguagem natural o que queres automatizar
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Ex: Quando um cliente não compra há 6 meses, criar tarefa de reativação para o responsável..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                A IA irá sugerir trigger, condições e ações. Tudo entra como rascunho.
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A gerar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Sugestão
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Example prompts */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Exemplos de prompts:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-2 text-left"
                  onClick={() => handleUseExample(example)}
                >
                  {example.length > 50 ? example.substring(0, 50) + "..." : example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 pt-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Suggestion result */}
      {suggestion && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{suggestion.name}</CardTitle>
              </div>
              <Badge variant="secondary">
                Confiança: {Math.round(suggestion.confidence * 100)}%
              </Badge>
            </div>
            <CardDescription>{suggestion.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Trigger */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded bg-amber-500/20">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                Gatilho
              </div>
              <div className="ml-8 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50">
                <p className="font-medium">{suggestion.trigger}</p>
                <p className="text-sm text-muted-foreground">{suggestion.triggerDescription}</p>
              </div>
            </div>

            {/* Conditions */}
            {suggestion.conditions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="p-1.5 rounded bg-blue-500/20">
                    <Filter className="h-4 w-4 text-blue-600" />
                  </div>
                  Condições ({suggestion.conditions.length})
                </div>
                <div className="ml-8 space-y-2">
                  {suggestion.conditions.map((cond, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50"
                    >
                      <p className="font-medium">
                        {cond.field} {cond.operator} {cond.value}
                      </p>
                      <p className="text-sm text-muted-foreground">{cond.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded bg-green-500/20">
                  <Play className="h-4 w-4 text-green-600" />
                </div>
                Ações ({suggestion.actions.length})
              </div>
              <div className="ml-8 space-y-2">
                {suggestion.actions.map((action, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200/50 flex items-center gap-2"
                  >
                    <ChevronRight className="h-4 w-4 text-green-600" />
                    <p className="text-sm">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-1">💡 Impacto estimado:</p>
              <p className="text-sm text-muted-foreground">{suggestion.impact}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button onClick={handleAccept} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Aceitar como Rascunho
              </Button>
              <Button
                variant="outline"
                onClick={() => setSuggestion(null)}
              >
                Descartar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Mock function to generate suggestions based on prompt
function generateMockSuggestion(prompt: string): SuggestedAutomation {
  const lower = prompt.toLowerCase();

  // Detect keywords to generate appropriate suggestion
  if (lower.includes("não compra") || lower.includes("inativo") || lower.includes("6 meses")) {
    return {
      name: "Reativação de Cliente Inativo",
      description: "Cria tarefa de reativação quando um cliente não efetua compras há 180 dias",
      trigger: "contact_inactive",
      triggerDescription: "Dispara quando um contacto fica inativo (sem compras) após o período definido",
      conditions: [
        {
          field: "Dias sem compra",
          operator: "maior que",
          value: "180",
          description: "Cliente sem atividade há mais de 6 meses",
        },
        {
          field: "Tipo de cliente",
          operator: "igual a",
          value: "Cliente",
          description: "Apenas para contactos já clientes",
        },
      ],
      actions: [
        {
          type: "create_task",
          description: "Criar tarefa de reativação para o responsável do cliente",
        },
        {
          type: "add_tag",
          description: "Adicionar tag 'reativação-pendente'",
        },
        {
          type: "notify_user",
          description: "Notificar o responsável sobre o cliente inativo",
        },
      ],
      impact: "Esta automação pode ajudar a recuperar clientes inativos, gerando oportunidades de venda. Com base em dados médios, a reativação de 10% dos clientes inativos pode representar um aumento significativo de receita.",
      confidence: 0.92,
    };
  }

  if (lower.includes("proposta") && (lower.includes("resposta") || lower.includes("dias"))) {
    return {
      name: "Follow-up de Proposta",
      description: "Cria tarefa de follow-up quando uma proposta não tem resposta após 3 dias",
      trigger: "after_x_days",
      triggerDescription: "Dispara 3 dias após o envio da proposta",
      conditions: [
        {
          field: "Estado da proposta",
          operator: "igual a",
          value: "Pendente",
          description: "Apenas propostas ainda não respondidas",
        },
      ],
      actions: [
        {
          type: "create_task",
          description: "Criar tarefa de follow-up urgente",
        },
        {
          type: "notify_user",
          description: "Notificar o comercial responsável",
        },
      ],
      impact: "O follow-up atempado aumenta a taxa de conversão de propostas. Estudos indicam que o contacto nos primeiros 3-5 dias pode aumentar a conversão em até 30%.",
      confidence: 0.88,
    };
  }

  if (lower.includes("pagamento") && lower.includes("atraso")) {
    return {
      name: "Alerta de Pagamento em Atraso",
      description: "Notifica o departamento financeiro quando um pagamento está em atraso",
      trigger: "payment_overdue",
      triggerDescription: "Dispara quando um pagamento está em atraso há 7 dias",
      conditions: [],
      actions: [
        {
          type: "block_credit",
          description: "Bloquear crédito do cliente",
        },
        {
          type: "create_financial_alert",
          description: "Criar alerta financeiro de alta prioridade",
        },
        {
          type: "notify_user",
          description: "Notificar departamento financeiro",
        },
      ],
      impact: "Esta automação ajuda a gerir o risco de crédito e acelerar a cobrança, reduzindo o prazo médio de recebimento.",
      confidence: 0.95,
    };
  }

  // Default suggestion
  return {
    name: "Automação Personalizada",
    description: "Automação baseada na tua descrição",
    trigger: "custom_field_updated",
    triggerDescription: "Dispara quando as condições especificadas são cumpridas",
    conditions: [
      {
        field: "Campo personalizado",
        operator: "alterado",
        value: "",
        description: "Quando um campo específico é alterado",
      },
    ],
    actions: [
      {
        type: "create_task",
        description: "Criar tarefa relacionada",
      },
      {
        type: "notify_user",
        description: "Notificar utilizador responsável",
      },
    ],
    impact: "Esta automação irá poupar tempo ao automatizar tarefas repetitivas relacionadas com a situação descrita.",
    confidence: 0.75,
  };
}
