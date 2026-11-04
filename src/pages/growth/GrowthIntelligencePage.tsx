import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceModules } from "@/hooks/useWorkspaceModules";
import { useModuleInstall } from "@/hooks/useModuleInstall";
import { useBgiSettings } from "@/hooks/useBgiSettings";
import { BgiKpiGrid } from "@/components/growth/BgiKpiGrid";
import { BUSINESS_TEMPLATES, resolveWorkspaceIndicators, type BusinessTemplateId } from "@/lib/bgi/indicatorCatalog";

export const GROWTH_MODULE_SLUG = "growth-intelligence";
const SUGGESTED: BusinessTemplateId[] = ["commerce", "education", "services"];
const UNIT_LABEL = { eur: "€", count: "nº", percent: "%", days: "dias", hours: "horas" } as const;
const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

function ActivationCard() {
  const { installModule } = useModuleInstall();
  const { data: mod, isLoading } = useQuery({
    queryKey: ["marketplace-module", GROWTH_MODULE_SLUG],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_modules")
        .select("id, name, description, price_eur, one_time_price_eur, stripe_price_id, stripe_one_time_price_id")
        .eq("slug", GROWTH_MODULE_SLUG)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />;
  if (!mod) return <p className="text-center text-muted-foreground">Módulo indisponível.</p>;

  const monthly = Number(mod.price_eur) || 0;
  const once = Number(mod.one_time_price_eur) || 0;
  const monthlyOk = monthly > 0 || !!mod.stripe_price_id;
  const onceOk = once > 0 || !!mod.stripe_one_time_price_id;

  return (
    <Card className="max-w-2xl w-full mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <CardTitle>{mod.name}</CardTitle>
        <CardDescription>{mod.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {[
          { key: "monthly" as const, title: "Mensal", desc: "Cancelável a qualquer momento", price: monthlyOk && monthly > 0 ? `${eur(monthly)}/mês` : null, ok: monthlyOk },
          { key: "one_time" as const, title: "Pagamento único", desc: "Licença vitalícia para este workspace", price: onceOk && once > 0 ? eur(once) : null, ok: onceOk },
        ].map((o) => (
          <div key={o.key} className="rounded-lg border p-4 flex flex-col gap-2">
            <p className="font-medium">{o.title}</p>
            <p className="text-sm text-muted-foreground">{o.desc}</p>
            <p className="text-2xl font-semibold">{o.price ?? "Preço por definir"}</p>
            <Button
              disabled={!o.ok || installModule.isPending}
              onClick={() => installModule.mutate({ moduleId: mod.id, billing: o.key })}
            >
              {installModule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ativar"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TemplatePicker() {
  const { data, isLoading, save } = useBgiSettings();
  const [selected, setSelected] = useState<BusinessTemplateId[]>([]);
  const firstTime = !isLoading && (data?.templateIds.length ?? 0) === 0;

  useEffect(() => {
    if (data) setSelected(data.templateIds.length ? data.templateIds : SUGGESTED);
  }, [data]);

  const indicators = useMemo(() => resolveWorkspaceIndicators(selected) ?? [], [selected]);
  const toggle = (id: BusinessTemplateId) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modelos de negócio</CardTitle>
          <CardDescription>
            {firstTime ? "Escolha um ou vários modelos. Sugerimos Comércio, Formação e Serviços." : "Pode combinar vários modelos; os indicadores não se repetem."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(BUSINESS_TEMPLATES).map((t) => (
              <label key={t.id} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <Checkbox checked={selected.includes(t.id)} onCheckedChange={() => toggle(t.id)} aria-label={t.name} />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
          <Button
            disabled={save.isPending || selected.length === 0}
            onClick={() => save.mutate(selected, {
              onSuccess: () => toast.success("Modelos guardados"),
              onError: (e) => toast.error(e instanceof Error ? e.message : "Sem permissão para guardar"),
            })}
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar modelos"}
          </Button>
        </CardContent>
      </Card>

      <BgiKpiGrid templateIds={data?.templateIds ?? []} />
    </div>
  );
}

export default function GrowthIntelligencePage() {
  const { isSuperAdmin } = useWorkspace();
  const { isModuleInstalled, isLoading } = useWorkspaceModules();
  const hasAccess = isSuperAdmin || isModuleInstalled(GROWTH_MODULE_SLUG);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold">Crescimento</h1>
        </div>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
        ) : hasAccess ? (
          <TemplatePicker />
        ) : (
          <ActivationCard />
        )}
      </div>
    </DashboardLayout>
  );
}
