import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Play, RotateCcw, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimulatorResult {
  type: "classify" | "summary" | "intelligence";
  data: Record<string, unknown> | null;
  error: string | null;
  latencyMs: number;
}

export function SimulatorTab() {
  const [sampleText, setSampleText] = useState("");
  const [results, setResults] = useState<SimulatorResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const buildMessages = () => {
    const lines = sampleText.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const lower = line.toLowerCase();
      const isInbound = lower.startsWith("cliente:") || lower.startsWith("customer:") || lower.startsWith("c:");
      const content = line.replace(/^(cliente|customer|agent|agente|equipa|c|a):\s*/i, "").trim();
      return { direction: isInbound ? "inbound" : "outbound", content };
    });
  };

  const runAll = async () => {
    const messages = buildMessages();
    if (messages.length === 0) {
      toast.error("Adicione pelo menos uma mensagem de exemplo");
      return;
    }

    setIsRunning(true);
    setResults([]);

    const run = async (type: SimulatorResult["type"], fnName: string, body: Record<string, unknown>): Promise<SimulatorResult> => {
      const start = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke(fnName, { body });
        const latencyMs = Math.round(performance.now() - start);
        if (error) return { type, data: null, error: error.message, latencyMs };
        if (data?.error) return { type, data: null, error: data.error, latencyMs };
        return { type, data, error: null, latencyMs };
      } catch (err) {
        return { type, data: null, error: err instanceof Error ? err.message : "Erro", latencyMs: Math.round(performance.now() - start) };
      }
    };

    const [classify, summary, intelligence] = await Promise.all([
      run("classify", "classify-conversation", { messages }),
      run("summary", "conversation-summary", { messages }),
      run("intelligence", "conversation-intelligence", { messages }),
    ]);

    setResults([classify, summary, intelligence]);
    setIsRunning(false);
  };

  const labelMap: Record<string, string> = {
    classify: "Classificação",
    summary: "Resumo",
    intelligence: "Inteligência",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulador de Conversa</CardTitle>
          <p className="text-sm text-muted-foreground">
            Teste a classificação, resumo e inteligência com mensagens de exemplo. Prefixe cada linha com <code className="bg-muted px-1 rounded text-xs">Cliente:</code> ou <code className="bg-muted px-1 rounded text-xs">Agente:</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            placeholder={`Cliente: Olá, quanto custa o plano premium?\nAgente: O plano premium custa 49€/mês.\nCliente: É possível ter desconto para 12 meses?`}
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={runAll} disabled={isRunning || !sampleText.trim()}>
              {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Executar Tudo
            </Button>
            <Button variant="outline" onClick={() => { setResults([]); setSampleText(""); }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {results.map((r) => (
            <Card key={r.type} className={r.error ? "border-destructive/50" : "border-primary/30"}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{labelMap[r.type]}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{r.latencyMs}ms</Badge>
                    {r.error ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {r.error ? (
                  <p className="text-sm text-destructive">{r.error}</p>
                ) : (
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64 whitespace-pre-wrap">
                    {JSON.stringify(r.data, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
