import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, Shield, Truck, Award, Sparkles } from "lucide-react";
import {
  makeDefaultOfferPageConfig,
  parseOfferPageConfig,
  PRESET_LABELS,
  CONVERSION_GOAL_LABELS,
  SECTION_LABELS,
  DEFAULT_SECTIONS_BY_PRESET,
  DEFAULT_CONVERSION_BY_PRESET,
  AVAILABLE_CONVERSION_GOALS,
  type OfferPageConfig,
  type OfferPreset,
  type OfferSectionKey,
  type ConversionGoal,
  type OfferFaqItem,
} from "@/components/store/offer-page/offerPageTypes";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";

interface Props {
  productId: string;
  workspaceId: string;
  metadata: Record<string, any> | null | undefined;
}

const LUCIDE_ICONS = [
  { value: "Shield", label: "Escudo" },
  { value: "Truck", label: "Envio" },
  { value: "Award", label: "Prémio" },
  { value: "Sparkles", label: "Certificação" },
  { value: "Lock", label: "Pagamento seguro" },
  { value: "Heart", label: "Cuidado" },
  { value: "CheckCircle", label: "Garantia" },
  { value: "Clock", label: "Rápido" },
  { value: "Star", label: "Qualidade" },
  { value: "Users", label: "Apoio" },
];

const SECTION_ORDER: OfferSectionKey[] = [
  "description",
  "benefits",
  "specifications",
  "ingredients",
  "howToUse",
  "program",
  "instructor",
  "sessions",
  "equipment",
  "installation",
  "delivery",
  "warranty",
  "video",
  "documents",
  "reviews",
  "faq",
  "relatedProducts",
];

export function ProductOfferPageSettingsTab({ productId, workspaceId, metadata }: Props) {
  const qc = useQueryClient();
  const initial = useMemo(
    () => parseOfferPageConfig(metadata) ?? { ...makeDefaultOfferPageConfig(), enabled: false },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productId],
  );
  const [config, setConfig] = useState<OfferPageConfig>(initial);
  const [sectionOrder, setSectionOrder] = useState<OfferSectionKey[]>(SECTION_ORDER);

  useEffect(() => {
    setConfig(initial);
  }, [initial]);

  const save = useMutation({
    mutationFn: async (next: OfferPageConfig) => {
      const nextMetadata = { ...(metadata || {}), offer_page: next };
      const { error } = await supabase
        .from("products")
        .update({ metadata: nextMetadata as any })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", productId] });
      qc.invalidateQueries({ queryKey: ["store-product", productId] });
      toast.success("Página de Oferta guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = (p: Partial<OfferPageConfig>) => setConfig((c) => ({ ...c, ...p }));

  const changePreset = (preset: OfferPreset) => {
    setConfig((c) => ({
      ...c,
      preset,
      conversionGoal: DEFAULT_CONVERSION_BY_PRESET[preset],
      sections: { ...DEFAULT_SECTIONS_BY_PRESET[preset] },
    }));
  };

  const toggleSection = (key: OfferSectionKey, val: boolean) => {
    setConfig((c) => ({ ...c, sections: { ...c.sections, [key]: val } }));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    setSectionOrder((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const addBadge = () => {
    if (config.trustBadges.length >= 4) return;
    setConfig((c) => ({
      ...c,
      trustBadges: [...c.trustBadges, { icon: "Shield", title: "", description: "" }],
    }));
  };

  const removeBadge = (i: number) => {
    setConfig((c) => ({ ...c, trustBadges: c.trustBadges.filter((_, idx) => idx !== i) }));
  };

  const patchBadge = (i: number, p: Partial<{ icon: string; title: string; description: string }>) => {
    setConfig((c) => ({
      ...c,
      trustBadges: c.trustBadges.map((b, idx) => (idx === i ? { ...b, ...p } : b)),
    }));
  };

  const addFaq = () => {
    const item: OfferFaqItem = {
      id: crypto.randomUUID(),
      question: "",
      answer: "",
      active: true,
    };
    setConfig((c) => ({ ...c, faqItems: [...c.faqItems, item] }));
  };

  const removeFaq = (id: string) =>
    setConfig((c) => ({ ...c, faqItems: c.faqItems.filter((f) => f.id !== id) }));

  const patchFaq = (id: string, p: Partial<OfferFaqItem>) => {
    setConfig((c) => ({
      ...c,
      faqItems: c.faqItems.map((f) => (f.id === id ? { ...f, ...p } : f)),
    }));
  };

  // Public URL preview — falls back to workspaceId if slug not resolved.
  const wsResolved = useResolveStoreWorkspace(workspaceId);
  const publicUrl = wsResolved.slug
    ? `/store/${wsResolved.slug}/product/${productId}`
    : `/store/${workspaceId}/product/${productId}`;

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Página Inteligente de Oferta</h3>
              {config.enabled ? (
                <Badge variant="default">Ativa</Badge>
              ) : (
                <Badge variant="secondary">Desativada</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Quando desativada, a loja usa a página de produto atual.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => patch({ enabled: v })}
              aria-label="Ativar Página Inteligente de Oferta"
            />
          </div>
        </div>

        {config.enabled && (
          <div className="mt-3">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir página pública
            </a>
          </div>
        )}
      </Card>

      {/* Preset & Goal */}
      <Card className="p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Preset</Label>
            <Select value={config.preset} onValueChange={(v) => changePreset(v as OfferPreset)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRESET_LABELS) as OfferPreset[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRESET_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Objetivo de conversão</Label>
            <Select
              value={config.conversionGoal}
              onValueChange={(v) => patch({ conversionGoal: v as ConversionGoal })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_CONVERSION_GOALS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {CONVERSION_GOAL_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Commercial copy */}
      <Card className="p-4 space-y-3">
        <h4 className="font-medium">Texto comercial</h4>
        <p className="text-xs text-muted-foreground">
          Deixe em branco para usar os dados atuais do produto como fallback.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Título principal</Label>
            <Input
              value={config.headline || ""}
              onChange={(e) => patch({ headline: e.target.value })}
              maxLength={140}
            />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input
              value={config.subheadline || ""}
              onChange={(e) => patch({ subheadline: e.target.value })}
              maxLength={180}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição curta</Label>
            <Textarea
              value={config.shortDescription || ""}
              onChange={(e) => patch({ shortDescription: e.target.value })}
              rows={3}
              maxLength={400}
            />
          </div>
          <div>
            <Label>Texto do CTA principal</Label>
            <Input
              value={config.ctaLabel || ""}
              onChange={(e) => patch({ ctaLabel: e.target.value })}
              maxLength={40}
              placeholder={CONVERSION_GOAL_LABELS[config.conversionGoal]}
            />
          </div>
          <div>
            <Label>Texto secundário</Label>
            <Input
              value={config.secondaryCtaLabel || ""}
              onChange={(e) => patch({ secondaryCtaLabel: e.target.value })}
              maxLength={40}
            />
          </div>
          <div>
            <Label>Etiqueta promocional</Label>
            <Input
              value={config.promoLabel || ""}
              onChange={(e) => patch({ promoLabel: e.target.value })}
              maxLength={40}
            />
          </div>
          <div>
            <Label>Mensagem de entrega/disponibilidade</Label>
            <Input
              value={config.deliveryText || ""}
              onChange={(e) => patch({ deliveryText: e.target.value })}
              maxLength={120}
            />
          </div>
        </div>
      </Card>

      {/* Trust Badges */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Selos de confiança ({config.trustBadges.length}/4)</h4>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addBadge}
            disabled={config.trustBadges.length >= 4}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
        {config.trustBadges.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum selo configurado.</p>
        )}
        <div className="space-y-2">
          {config.trustBadges.map((b, i) => (
            <div key={i} className="flex items-start gap-2 rounded-md border p-3">
              <div className="w-32 shrink-0">
                <Label className="text-xs">Ícone</Label>
                <Select value={b.icon} onValueChange={(v) => patchBadge(i, { icon: v })}>
                  <SelectTrigger className="mt-1 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LUCIDE_ICONS.map((ic) => (
                      <SelectItem key={ic.value} value={ic.value}>
                        {ic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Título (ex.: Pagamento seguro)"
                  value={b.title}
                  onChange={(e) => patchBadge(i, { title: e.target.value })}
                  maxLength={60}
                />
                <Input
                  placeholder="Descrição curta (opcional)"
                  value={b.description || ""}
                  onChange={(e) => patchBadge(i, { description: e.target.value })}
                  maxLength={100}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBadge(i)}
                aria-label="Remover selo"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Sections */}
      <Card className="p-4 space-y-3">
        <h4 className="font-medium">Secções visíveis</h4>
        <p className="text-xs text-muted-foreground">
          Ative ou desative blocos. Use as setas para reordenar.
        </p>
        <div className="divide-y">
          {sectionOrder.map((key, idx) => (
            <div key={key} className="flex items-center gap-2 py-2">
              <div className="flex flex-col gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => moveSection(idx, -1)}
                  aria-label="Subir"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => moveSection(idx, +1)}
                  aria-label="Descer"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1 text-sm">{SECTION_LABELS[key]}</div>
              <Switch
                checked={config.sections[key] === true}
                onCheckedChange={(v) => toggleSection(key, v)}
                aria-label={`Ativar ${SECTION_LABELS[key]}`}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* FAQ */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Perguntas frequentes ({config.faqItems.length})</h4>
          <Button type="button" size="sm" variant="outline" onClick={addFaq}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
        <div className="space-y-2">
          {config.faqItems.map((f) => (
            <div key={f.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Pergunta"
                  value={f.question}
                  onChange={(e) => patchFaq(f.id, { question: e.target.value })}
                  maxLength={200}
                />
                <Switch
                  checked={f.active}
                  onCheckedChange={(v) => patchFaq(f.id, { active: v })}
                  aria-label="Ativa"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFaq(f.id)}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                placeholder="Resposta"
                value={f.answer}
                onChange={(e) => patchFaq(f.id, { answer: e.target.value })}
                rows={2}
                maxLength={1000}
              />
            </div>
          ))}
        </div>
      </Card>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfig(initial)}
        >
          Repor
        </Button>
        <Button type="button" onClick={() => save.mutate(config)} disabled={save.isPending}>
          {save.isPending ? "A guardar..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

