import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, Check, AlertTriangle, Weight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BatchWeightEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingWeightCount: number;
}

interface BatchResult {
  id: string;
  name: string;
  weight_kg?: number;
  confidence?: string;
  reasoning?: string;
  status: string;
}

export function BatchWeightEstimateDialog({ open, onOpenChange, missingWeightCount }: BatchWeightEstimateDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [stats, setStats] = useState({ updated: 0, skipped: 0, total: 0 });

  const handleRun = async () => {
    if (!currentWorkspace?.id) return;
    setRunning(true);
    setDone(false);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke("ai-batch-estimate-weights", {
        body: { workspaceId: currentWorkspace.id, minConfidence: "medium" },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro no processamento");

      setResults(data.data.results || []);
      setStats({ updated: data.data.updated, skipped: data.data.skipped, total: data.data.total });
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${data.data.updated} produtos atualizados com peso estimado pela IA`);
    } catch (err) {
      toast.error("Erro ao estimar pesos em massa");
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const updatedResults = results.filter((r) => r.status === "updated");
  const skippedResults = results.filter((r) => r.status !== "updated");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5" /> Preencher Pesos com IA
          </DialogTitle>
          <DialogDescription>
            A IA vai estimar o peso de {missingWeightCount} produto{missingWeightCount !== 1 ? "s" : ""} sem peso definido, 
            com base no nome, SKU e categoria.
          </DialogDescription>
        </DialogHeader>

        {!done && !running && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
              <p className="text-sm"><strong>{missingWeightCount}</strong> produtos sem peso</p>
              <p className="text-xs text-muted-foreground">
                Apenas estimativas com confiança média ou alta serão aplicadas automaticamente.
                Produtos com confiança baixa ficam para revisão manual.
              </p>
            </div>
            <Button onClick={handleRun} className="w-full gap-2">
              <Sparkles className="h-4 w-4" /> Iniciar Estimativa
            </Button>
          </div>
        )}

        {running && (
          <div className="space-y-4 py-6">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">A estimar pesos dos produtos...</span>
            </div>
            <Progress value={50} className="animate-pulse" />
            <p className="text-xs text-center text-muted-foreground">
              Processamento em lotes de 5 produtos. Pode demorar alguns segundos.
            </p>
          </div>
        )}

        {done && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-primary">{stats.updated}</p>
                <p className="text-xs text-muted-foreground">Atualizados</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.skipped}</p>
                <p className="text-xs text-muted-foreground">Para revisão</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {/* Results list */}
            <ScrollArea className="h-60">
              <div className="space-y-1.5">
                {updatedResults.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-1.5">
                    <span className="truncate flex-1 mr-2">{r.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs">{r.weight_kg} kg</span>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </div>
                  </div>
                ))}
                {skippedResults.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-1.5 opacity-60">
                    <span className="truncate flex-1 mr-2">{r.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.weight_kg && <span className="font-mono text-xs">{r.weight_kg} kg</span>}
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
