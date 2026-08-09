import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { IXCard } from "@/components/entity/ix/IXCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import {
  useProductPageConfig,
  useUpdateProductPageConfig,
} from "@/hooks/store/useProductPageConfig";
import {
  DEFAULT_PRODUCT_PAGE_CONFIG,
  type ProductPageConfig,
} from "@/lib/store/productPageConfig";

const sb = supabase as any;

function ToggleRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

/** Definições da ficha de produto pública (faixa de confiança e blocos opcionais). */
export function StoreProductPageSettings() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { data, isLoading, isError, refetch } = useProductPageConfig(wsId);
  const update = useUpdateProductPageConfig(wsId);
  const [form, setForm] = useState<ProductPageConfig>(DEFAULT_PRODUCT_PAGE_CONFIG);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const { data: shippingCount } = useQuery({
    queryKey: ["store-active-shipping-count", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { count, error } = await sb
        .from("shipping_methods")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", wsId)
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
  });

  const set = <K extends keyof ProductPageConfig>(key: K, value: ProductPageConfig[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <IXCard>
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar as definições.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      </IXCard>
    );
  }

  return (
    <div className="space-y-4">
      {shippingCount === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center gap-2">
            Não existem métodos de envio ativos — a faixa de confiança fica sem prazos nem portes grátis.
            <Link to="/dashboard/store-settings" className="font-medium text-primary underline underline-offset-2">
              Configurar envios
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <IXCard
        title="Faixa de confiança"
        description="Sinais mostrados na ficha de produto. Só aparecem quando há dados reais configurados."
      >
        <ToggleRow
          id="trust-enabled"
          label="Mostrar faixa de confiança"
          checked={form.trust_enabled}
          onChange={(v) => set("trust_enabled", v)}
        />
        <ToggleRow
          id="trust-delivery"
          label="Prazo de entrega"
          hint="Usa o prazo do método de envio mais barato."
          checked={form.trust_delivery}
          disabled={!form.trust_enabled}
          onChange={(v) => set("trust_delivery", v)}
        />
        <ToggleRow
          id="trust-free-shipping"
          label="Portes grátis"
          hint="Mostra o limiar mais baixo configurado nos envios."
          checked={form.trust_free_shipping}
          disabled={!form.trust_enabled}
          onChange={(v) => set("trust_free_shipping", v)}
        />
        <ToggleRow
          id="trust-returns"
          label="Devoluções"
          checked={form.trust_returns}
          disabled={!form.trust_enabled}
          onChange={(v) => set("trust_returns", v)}
        />
        <div className="py-3">
          <Label htmlFor="trust-returns-text" className="text-xs text-muted-foreground">
            Texto das devoluções
          </Label>
          <Input
            id="trust-returns-text"
            value={form.trust_returns_text}
            maxLength={140}
            disabled={!form.trust_enabled || !form.trust_returns}
            onChange={(e) => set("trust_returns_text", e.target.value)}
            className="mt-1"
          />
        </div>
        <ToggleRow
          id="trust-secure"
          label="Pagamento seguro"
          checked={form.trust_secure_payment}
          disabled={!form.trust_enabled}
          onChange={(v) => set("trust_secure_payment", v)}
        />
        <ToggleRow
          id="trust-support"
          label="Apoio ao cliente"
          checked={form.trust_support}
          disabled={!form.trust_enabled}
          onChange={(v) => set("trust_support", v)}
        />
        <div className="py-3">
          <Label htmlFor="trust-support-text" className="text-xs text-muted-foreground">
            Texto do apoio ao cliente
          </Label>
          <Input
            id="trust-support-text"
            value={form.trust_support_text}
            maxLength={140}
            disabled={!form.trust_enabled || !form.trust_support}
            onChange={(e) => set("trust_support_text", e.target.value)}
            className="mt-1"
          />
        </div>
      </IXCard>

      <IXCard title="Blocos da ficha" description="Ativar ou desativar secções da ficha de produto pública.">
        <ToggleRow
          id="nudge"
          label="Aviso de decisão"
          hint="Stock baixo ou fim de promoção."
          checked={form.decision_nudge_enabled}
          onChange={(v) => set("decision_nudge_enabled", v)}
        />
        <ToggleRow
          id="sections"
          label="Secções de conteúdo"
          hint="Visão geral, como usar, especificações e clínico (apenas publicadas)."
          checked={form.sections_enabled}
          onChange={(v) => set("sections_enabled", v)}
        />
        <ToggleRow
          id="bundles"
          label="Packs"
          checked={form.bundles_enabled}
          onChange={(v) => set("bundles_enabled", v)}
        />
        <ToggleRow
          id="alternatives"
          label="Alternativas mais baratas"
          checked={form.cheaper_alternatives_enabled}
          onChange={(v) => set("cheaper_alternatives_enabled", v)}
        />
        <ToggleRow
          id="qa"
          label="Perguntas e respostas"
          checked={form.qa_enabled}
          onChange={(v) => set("qa_enabled", v)}
        />
        <ToggleRow
          id="qa-ask"
          label="Permitir novas perguntas"
          hint="As perguntas ficam sempre por moderar antes de serem publicadas."
          checked={form.qa_allow_questions}
          disabled={!form.qa_enabled}
          onChange={(v) => set("qa_allow_questions", v)}
        />
      </IXCard>

      <div className="flex justify-end">
        <Button onClick={() => update.mutate(form)} disabled={update.isPending || !wsId} className="gap-2">
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
