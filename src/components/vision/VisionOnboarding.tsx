import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Eye, Rocket } from "lucide-react";
import { useCreateVision } from "@/hooks/useVision";

export function VisionOnboarding() {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const createVision = useCreateVision();

  const handleCreate = () => {
    if (!title.trim()) return;
    createVision.mutate({ title, objective, target_date: targetDate || undefined });
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6">
      <Card className="max-w-lg w-full border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-600/5">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto">
              <Eye className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Cria a tua Visão</h2>
            <p className="text-sm text-muted-foreground">Define o teu objetivo principal e a data-alvo para começar.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Título da Visão *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Faturar 100K€ até Dezembro 2026" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Objetivo</Label>
              <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Descreve o teu objetivo..." className="bg-background min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data-alvo</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="bg-background" />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!title.trim() || createVision.isPending}
            className="w-full gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <Rocket className="h-4 w-4" />{createVision.isPending ? "A criar..." : "Criar Visão"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
