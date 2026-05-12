import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save } from "lucide-react";
import { toast } from "sonner";
import {
  useLeadChefAppConfig,
  useUpsertLeadChefAppConfig,
  LEADCHEF_DEFAULT_MODULES,
  type LeadChefAppConfig,
} from "@/hooks/leadchef/useLeadChefAppConfig";

const MODULE_LABELS: Record<string, string> = {
  today: "Hoje",
  leads: "Leads",
  agenda: "Agenda",
  clientes: "Clientes",
  referencias: "Referências",
  objetivos: "Objetivos",
  equipa: "Equipa",
  templates: "Templates",
  automacoes: "Automações",
  sequencias: "Sequências",
  relatorios: "Relatórios",
  inteligencia: "Inteligência",
  notificacoes: "Notificações",
  ferramentas: "Ferramentas",
};

export function LeadChefAppConfigEditor({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading } = useLeadChefAppConfig(workspaceId);
  const upsert = useUpsertLeadChefAppConfig();
  const [form, setForm] = useState<Partial<LeadChefAppConfig>>({});
  const [hydrated, setHydrated] = useState(false);

  if (!hydrated && !isLoading) {
    setForm(
      data ?? {
        workspace_id: workspaceId,
        enabled_modules: [...LEADCHEF_DEFAULT_MODULES],
        primary_color: null,
        accent_color: null,
        logo_url: null,
      },
    );
    setHydrated(true);
  }

  const enabled = new Set(form.enabled_modules ?? []);
  const toggle = (key: string, on: boolean) => {
    const next = new Set(enabled);
    if (on) next.add(key); else next.delete(key);
    setForm((f) => ({ ...f, enabled_modules: Array.from(next) }));
  };

  const save = async () => {
    try {
      await upsert.mutateAsync({ ...form, workspace_id: workspaceId } as any);
      toast.success("Configuração da app guardada.");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao guardar.");
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">A carregar configuração…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="mb-1.5 block text-xs">Logo URL</Label>
            <Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Cor primária (HSL ou hex)</Label>
            <Input value={form.primary_color ?? ""} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} placeholder="ex: 24 95% 53%" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Cor de destaque</Label>
            <Input value={form.accent_color ?? ""} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} placeholder="ex: 14 100% 50%" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulos visíveis na app</CardTitle>
          <p className="text-xs text-muted-foreground">
            Controla quais entradas aparecem no shell mobile do LeadChef.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {LEADCHEF_DEFAULT_MODULES.map((key) => (
            <label key={key} className="flex items-center gap-2 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
              <Checkbox checked={enabled.has(key)} onCheckedChange={(v) => toggle(key, !!v)} />
              <span className="text-sm">{MODULE_LABELS[key] ?? key}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" /> Guardar configuração
        </Button>
      </div>
    </div>
  );
}
