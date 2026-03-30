import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Settings2 } from "lucide-react";
import { useAgentOpsSettings } from "@/hooks/useAgentOperations";

export function AgentOpsSettings() {
  const { settings, isLoading, upsert } = useAgentOpsSettings();

  const [form, setForm] = useState({
    is_enabled: false,
    auto_routing_enabled: false,
    auto_handoff_enabled: false,
    human_fallback_enabled: true,
    supervisor_enabled: false,
    max_open_items_per_agent: 10,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        is_enabled: settings.is_enabled,
        auto_routing_enabled: settings.auto_routing_enabled,
        auto_handoff_enabled: settings.auto_handoff_enabled,
        human_fallback_enabled: settings.human_fallback_enabled,
        supervisor_enabled: settings.supervisor_enabled,
        max_open_items_per_agent: settings.max_open_items_per_agent,
      });
    }
  }, [settings]);

  const handleSave = () => upsert.mutate(form);

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="w-4 h-4" /> Configurações Agent Ops
        </CardTitle>
        <CardDescription>Controla o motor de routing e orquestração de agentes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Ativar Agent Ops</Label>
          <Switch checked={form.is_enabled} onCheckedChange={v => setForm(f => ({ ...f, is_enabled: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Routing automático</Label>
          <Switch checked={form.auto_routing_enabled} onCheckedChange={v => setForm(f => ({ ...f, auto_routing_enabled: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Handoff automático</Label>
          <Switch checked={form.auto_handoff_enabled} onCheckedChange={v => setForm(f => ({ ...f, auto_handoff_enabled: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Fallback humano</Label>
          <Switch checked={form.human_fallback_enabled} onCheckedChange={v => setForm(f => ({ ...f, human_fallback_enabled: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Supervisor ativo</Label>
          <Switch checked={form.supervisor_enabled} onCheckedChange={v => setForm(f => ({ ...f, supervisor_enabled: v }))} />
        </div>
        <div className="space-y-1">
          <Label>Max items abertos por agente</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={form.max_open_items_per_agent}
            onChange={e => setForm(f => ({ ...f, max_open_items_per_agent: parseInt(e.target.value) || 10 }))}
            className="w-24"
          />
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending} size="sm">
          {upsert.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
