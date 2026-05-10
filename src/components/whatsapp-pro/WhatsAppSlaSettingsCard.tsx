import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Settings2, Sparkles } from "lucide-react";
import { useWhatsAppSlaSettings, useUpdateWhatsAppSlaSettings } from "@/hooks/useWhatsAppInbox";
import { Link } from "react-router-dom";

export function WhatsAppSlaSettingsCard() {
  const { data: settings, isLoading } = useWhatsAppSlaSettings();
  const update = useUpdateWhatsAppSlaSettings();
  const [firstResp, setFirstResp] = useState<number | null>(null);
  const [resolution, setResolution] = useState<number | null>(null);
  const [autoAssign, setAutoAssign] = useState<boolean | null>(null);

  const fr = firstResp ?? settings?.whatsapp_pro_sla_first_response_minutes ?? 15;
  const rs = resolution ?? settings?.whatsapp_pro_sla_resolution_hours ?? 24;
  const aa = autoAssign ?? settings?.whatsapp_pro_auto_assign_enabled ?? false;

  const handleSave = async () => {
    await update.mutateAsync({
      whatsapp_pro_sla_first_response_minutes: Math.max(1, Math.min(1440, fr)),
      whatsapp_pro_sla_resolution_hours: Math.max(1, Math.min(720, rs)),
      whatsapp_pro_auto_assign_enabled: aa,
    });
    setFirstResp(null);
    setResolution(null);
    setAutoAssign(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">SLA & Atribuição automática</CardTitle>
        </div>
        <CardDescription>
          Define os tempos esperados de resposta e ativa a atribuição automática a operadores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="py-6 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="first-resp">Primeira resposta (minutos)</Label>
                <Input
                  id="first-resp"
                  type="number"
                  min={1}
                  max={1440}
                  value={fr}
                  onChange={(e) => setFirstResp(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo máximo aceitável até responder a um contacto novo.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resolution">Resolução (horas)</Label>
                <Input
                  id="resolution"
                  type="number"
                  min={1}
                  max={720}
                  value={rs}
                  onChange={(e) => setResolution(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo alvo para encerrar a conversa.
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-assign">Atribuição automática</Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativada, novas conversas WhatsApp são distribuídas automaticamente segundo as regras de routing.
                </p>
              </div>
              <Switch id="auto-assign" checked={aa} onCheckedChange={setAutoAssign} />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 text-xs flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <div>
                Para definir critérios avançados (intenção, prioridade, etiquetas, agente), configure as
                <Link to="/dashboard/team-inbox/routing" className="text-primary underline mx-1">regras de roteamento</Link>
                ou os
                <Link to="/dashboard/team-inbox/agents" className="text-primary underline mx-1">perfis de agente</Link>.
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={update.isPending} className="gap-1.5">
                {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
