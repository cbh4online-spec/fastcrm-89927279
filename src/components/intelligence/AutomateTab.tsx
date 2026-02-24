import { useState } from "react";
import { useGenerateAutomation, automationExamples } from "@/hooks/useGenerateAutomation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function AutomateTab() {
  const [request, setRequest] = useState("");
  const generateAutomation = useGenerateAutomation();

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

  return (
    <div className="space-y-6">
      {/* Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Automation Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="Describe the automation you want to create..."
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
              Generate
            </Button>
          </div>

          {/* Examples */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Quick examples:</p>
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

      {/* Generated Result */}
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
                  <p className="text-xs font-medium text-muted-foreground">Conditions:</p>
                  {generateAutomation.data.conditions.map((c: any, i: number) => (
                    <p key={i} className="text-xs text-muted-foreground ml-2">
                      • {c.field_name} {c.operator} {c.value}
                    </p>
                  ))}
                </div>
              )}

              {generateAutomation.data.actions?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Actions:</p>
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
              onClick={() => toast.success("Automation saved! Go to Automations to activate it.")}
            >
              <Zap className="h-3.5 w-3.5" />
              Save Automation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
