import { useState } from "react";
import { useGenerateAutomation, automationExamples } from "@/hooks/useGenerateAutomation";
import { useSaveGeneratedAutomation } from "@/hooks/useSaveGeneratedAutomation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, Sparkles, ArrowRight, CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";

export function AutomateTab() {
  const [request, setRequest] = useState("");
  const generateAutomation = useGenerateAutomation();
  const saveAutomation = useSaveGeneratedAutomation();

  const handleGenerate = (text: string) => {
    if (!text.trim()) return;
    generateAutomation.mutate(
      { userRequest: text },
      {
        onSuccess: () => {
          toast.success("Automação gerada com sucesso!");
          setRequest("");
        },
      }
    );
  };

  const handleSave = () => {
    if (!generateAutomation.data) return;
    saveAutomation.mutate(generateAutomation.data);
  };

  return (
    <div className="space-y-6">
      {/* Gerador */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Gerador de Automações com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Descreva a automação que quer criar..."
              onKeyDown={(e) => e.key === "Enter" && handleGenerate(request)}
              disabled={generateAutomation.isPending}
            />
            <Button
              onClick={() => handleGenerate(request)}
              disabled={!request.trim() || generateAutomation.isPending}
              className="gap-1.5 shrink-0"
            >
              {generateAutomation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Gerar
            </Button>
          </div>

          {/* Exemplos */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Exemplos rápidos:</p>
            <div className="flex flex-wrap gap-2">
              {automationExamples.slice(0, 4).map((ex, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setRequest(ex.request);
                    handleGenerate(ex.request);
                  }}
                  disabled={generateAutomation.isPending}
                  className="text-xs px-3 py-1.5 rounded-full border bg-muted hover:bg-muted/80 transition-colors text-left"
                >
                  {ex.text}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado Gerado */}
      {generateAutomation.data && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-base">{generateAutomation.data.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{generateAutomation.data.description}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">Trigger</Badge>
                <span>{generateAutomation.data.trigger}</span>
              </div>

              {generateAutomation.data.conditions?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Condições:</p>
                  {generateAutomation.data.conditions.map((c: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground ml-2">
                      • {c.field_name} {c.operator} {c.value}
                    </p>
                  ))}
                </div>
              )}

              {generateAutomation.data.actions?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Ações:</p>
                  {generateAutomation.data.actions.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
                      <ArrowRight className="h-3 w-3" />
                      <span>{a.action_type}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3 mt-3">
                {generateAutomation.data.natural_language_summary}
              </p>
            </div>

            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={saveAutomation.isPending}
            >
              {saveAutomation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Guardar Automação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
