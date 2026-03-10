import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { useUpdateVision, type VisionProfile } from "@/hooks/useVision";

interface Props {
  vision: VisionProfile;
}

export function VisionSettingsPanel({ vision }: Props) {
  const [title, setTitle] = useState(vision.title);
  const [targetDate, setTargetDate] = useState(vision.target_date || "");
  const [mode, setMode] = useState(vision.mode);
  const updateVision = useUpdateVision();

  const handleSave = () => {
    updateVision.mutate({
      id: vision.id,
      title,
      target_date: targetDate || null,
      mode,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-foreground">Definições da Visão</h2>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-sm font-medium">Dados Gerais</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Título da Visão</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Data-alvo</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Modo</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="duo">Duo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-sm font-medium">Notificações</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Lembrete de briefing diário</p>
              <p className="text-xs text-muted-foreground">Receber notificação para iniciar o briefing</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Resumo semanal</p>
              <p className="text-xs text-muted-foreground">Receber email com resumo do progresso</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Celebração de vitórias</p>
              <p className="text-xs text-muted-foreground">Animações ao registar vitórias</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Button className="gap-2" onClick={handleSave} disabled={updateVision.isPending}>
        {updateVision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar Definições
      </Button>
    </div>
  );
}
