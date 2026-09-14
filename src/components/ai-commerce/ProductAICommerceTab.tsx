/**
 * Separador "AI Commerce" da ficha de produto.
 *
 * Escreve apenas em `product_ai_commerce` e nos campos comerciais/SEO do
 * produto que a camada de IA precisa. Nunca gera preços nem dados inventados.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Sparkles, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useProductAICommerce,
  useSaveProductAICommerce,
  useUpdateCommerceProduct,
} from "@/hooks/useAICommerce";
import { evaluateReadiness } from "@/lib/ai-commerce/readiness";
import { ReadinessScoreCard } from "./ReadinessScoreCard";
import type { AIFaqEntry, CommerceProduct, ProductAICommerce } from "@/lib/ai-commerce/types";

interface Props {
  product: CommerceProduct;
  activeFeeds?: number;
}

const emptyState = {
  ai_commerce_enabled: false,
  ai_title: "",
  ai_short_description: "",
  ai_long_description: "",
  ai_category: "",
  ai_target_audience: "",
  ai_problem_solved: "",
  ai_use_cases: "",
  ai_key_features: "",
  ai_keywords: "",
  ai_recommendation_context: "",
  ai_exclusions: "",
};

function toLines(list: string[] | null | undefined): string {
  return (list || []).join("\n");
}

function fromLines(value: string): string[] {
  return value
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function ProductAICommerceTab({ product, activeFeeds = 0 }: Props) {
  const { data: existing, isLoading } = useProductAICommerce(product.id);
  const save = useSaveProductAICommerce(product.id);
  const updateProduct = useUpdateCommerceProduct(product.id);

  const [form, setForm] = useState(emptyState);
  const [faq, setFaq] = useState<AIFaqEntry[]>([]);
  const [seo, setSeo] = useState({
    brand: "",
    gtin: "",
    mpn: "",
    schema_type: "",
    seo_title: "",
    seo_description: "",
    canonical_url: "",
    checkout_url: "",
    languages: "",
    countries: "",
  });
  const [benefits, setBenefits] = useState("");

  useEffect(() => {
    setForm({
      ai_commerce_enabled: existing?.ai_commerce_enabled ?? false,
      ai_title: existing?.ai_title ?? "",
      ai_short_description: existing?.ai_short_description ?? "",
      ai_long_description: existing?.ai_long_description ?? "",
      ai_category: existing?.ai_category ?? "",
      ai_target_audience: existing?.ai_target_audience ?? "",
      ai_problem_solved: existing?.ai_problem_solved ?? "",
      ai_use_cases: toLines(existing?.ai_use_cases),
      ai_key_features: toLines(existing?.ai_key_features),
      ai_keywords: (existing?.ai_keywords || []).join(", "),
      ai_recommendation_context: existing?.ai_recommendation_context ?? "",
      ai_exclusions: existing?.ai_exclusions ?? "",
    });
    setFaq(Array.isArray(existing?.ai_faq) ? existing!.ai_faq! : []);
  }, [existing]);

  useEffect(() => {
    setSeo({
      brand: product.brand ?? "",
      gtin: product.gtin ?? "",
      mpn: product.mpn ?? "",
      schema_type: product.schema_type ?? "",
      seo_title: product.seo_title ?? "",
      seo_description: product.seo_description ?? "",
      canonical_url: product.canonical_url ?? "",
      checkout_url: product.checkout_url ?? "",
      languages: (product.languages || []).join(", "),
      countries: (product.countries || []).join(", "),
    });
    setBenefits(toLines(product.main_benefits ?? product.benefits));
  }, [product]);

  const draftAi = useMemo<Partial<ProductAICommerce>>(
    () => ({
      product_id: product.id,
      ai_commerce_enabled: form.ai_commerce_enabled,
      ai_title: form.ai_title || null,
      ai_short_description: form.ai_short_description || null,
      ai_long_description: form.ai_long_description || null,
      ai_category: form.ai_category || null,
      ai_target_audience: form.ai_target_audience || null,
      ai_problem_solved: form.ai_problem_solved || null,
      ai_use_cases: fromLines(form.ai_use_cases),
      ai_key_features: fromLines(form.ai_key_features),
      ai_keywords: form.ai_keywords.split(",").map((k) => k.trim()).filter(Boolean),
      ai_recommendation_context: form.ai_recommendation_context || null,
      ai_exclusions: form.ai_exclusions || null,
      ai_faq: faq.filter((f) => f.question.trim() && f.answer.trim()),
    }),
    [form, faq, product.id],
  );

  const draftProduct = useMemo<CommerceProduct>(
    () => ({
      ...product,
      brand: seo.brand || null,
      gtin: seo.gtin || null,
      mpn: seo.mpn || null,
      schema_type: seo.schema_type || null,
      seo_title: seo.seo_title || null,
      seo_description: seo.seo_description || null,
      canonical_url: seo.canonical_url || null,
      checkout_url: seo.checkout_url || null,
      languages: seo.languages.split(",").map((v) => v.trim()).filter(Boolean),
      countries: seo.countries.split(",").map((v) => v.trim()).filter(Boolean),
      main_benefits: fromLines(benefits),
    }),
    [product, seo, benefits],
  );

  const readiness = useMemo(
    () => evaluateReadiness(draftProduct, draftAi, { activeFeeds }),
    [draftProduct, draftAi, activeFeeds],
  );

  const [isGenerating, setIsGenerating] = useState(false);

  /** Preenche apenas campos vazios, a partir dos dados reais do produto. */
  const handleAutofill = async (overwrite: boolean) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-commerce-autofill", {
        body: { productId: product.id },
      });
      if (error) throw error;
      const s = (data as { suggestion?: Record<string, unknown> })?.suggestion;
      if (!s) throw new Error("Sem sugestões");

      const text = (current: string, next: unknown) =>
        typeof next === "string" && next.trim() && (overwrite || !current.trim()) ? next.trim() : current;
      const lines = (current: string, next: unknown) =>
        Array.isArray(next) && next.length && (overwrite || !current.trim())
          ? (next as string[]).join("\n")
          : current;

      setForm((f) => ({
        ...f,
        ai_title: text(f.ai_title, s.ai_title),
        ai_category: text(f.ai_category, s.ai_category),
        ai_short_description: text(f.ai_short_description, s.ai_short_description),
        ai_long_description: text(f.ai_long_description, s.ai_long_description),
        ai_target_audience: text(f.ai_target_audience, s.ai_target_audience),
        ai_problem_solved: text(f.ai_problem_solved, s.ai_problem_solved),
        ai_use_cases: lines(f.ai_use_cases, s.ai_use_cases),
        ai_key_features: lines(f.ai_key_features, s.ai_key_features),
        ai_keywords:
          Array.isArray(s.ai_keywords) && s.ai_keywords.length && (overwrite || !f.ai_keywords.trim())
            ? (s.ai_keywords as string[]).join(", ")
            : f.ai_keywords,
        ai_recommendation_context: text(f.ai_recommendation_context, s.ai_recommendation_context),
        ai_exclusions: text(f.ai_exclusions, s.ai_exclusions),
      }));

      if (Array.isArray(s.ai_faq) && s.ai_faq.length) {
        setFaq((prev) => (overwrite || prev.length === 0 ? (s.ai_faq as AIFaqEntry[]) : prev));
      }
      setSeo((prev) => ({
        ...prev,
        seo_title: text(prev.seo_title, s.seo_title),
        seo_description: text(prev.seo_description, s.seo_description),
      }));

      toast.success("Sugestões preenchidas. Reveja e guarde.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar sugestões");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProduct.mutateAsync({
        brand: draftProduct.brand,
        gtin: draftProduct.gtin,
        mpn: draftProduct.mpn,
        schema_type: draftProduct.schema_type,
        seo_title: draftProduct.seo_title,
        seo_description: draftProduct.seo_description,
        canonical_url: draftProduct.canonical_url,
        checkout_url: draftProduct.checkout_url,
        languages: draftProduct.languages,
        countries: draftProduct.countries,
      });
      await save.mutateAsync({ ...draftAi, readiness } as never);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isSaving = save.isPending || updateProduct.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4" aria-hidden />
                AI Commerce
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ativa a publicação deste produto em canais de IA e agentes de compra.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="ai-enabled" className="text-sm">
                Ativo
              </Label>
              <Switch
                id="ai-enabled"
                checked={form.ai_commerce_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ai_commerce_enabled: v }))}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div>
            <p className="text-sm font-medium">Preencher com IA</p>
            <p className="text-sm text-muted-foreground">
              Gera conteúdo a partir dos dados reais do produto. Não inventa preços, stock nem códigos.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleAutofill(false)} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Preencher campos vazios
            </Button>
            <Button variant="ghost" onClick={() => handleAutofill(true)} disabled={isGenerating}>
              Reescrever tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReadinessScoreCard readiness={readiness} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conteúdo para IA</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai_title">Título</Label>
            <Input
              id="ai_title"
              value={form.ai_title}
              maxLength={150}
              onChange={(e) => setForm((f) => ({ ...f, ai_title: e.target.value }))}
              placeholder={product.name || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_category">Categoria</Label>
            <Input
              id="ai_category"
              value={form.ai_category}
              maxLength={120}
              onChange={(e) => setForm((f) => ({ ...f, ai_category: e.target.value }))}
              placeholder={product.category || ""}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ai_short_description">Descrição curta</Label>
            <Textarea
              id="ai_short_description"
              value={form.ai_short_description}
              maxLength={400}
              rows={2}
              onChange={(e) => setForm((f) => ({ ...f, ai_short_description: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ai_long_description">Descrição longa</Label>
            <Textarea
              id="ai_long_description"
              value={form.ai_long_description}
              maxLength={5000}
              rows={5}
              onChange={(e) => setForm((f) => ({ ...f, ai_long_description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_target_audience">Público-alvo</Label>
            <Textarea
              id="ai_target_audience"
              value={form.ai_target_audience}
              maxLength={800}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, ai_target_audience: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_problem_solved">Problema que resolve</Label>
            <Textarea
              id="ai_problem_solved"
              value={form.ai_problem_solved}
              maxLength={800}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, ai_problem_solved: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_use_cases">Casos de uso (um por linha)</Label>
            <Textarea
              id="ai_use_cases"
              value={form.ai_use_cases}
              rows={5}
              onChange={(e) => setForm((f) => ({ ...f, ai_use_cases: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_key_features">Funcionalidades (uma por linha)</Label>
            <Textarea
              id="ai_key_features"
              value={form.ai_key_features}
              rows={5}
              onChange={(e) => setForm((f) => ({ ...f, ai_key_features: e.target.value }))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ai_recommendation_context">Contexto de recomendação</Label>
            <Textarea
              id="ai_recommendation_context"
              value={form.ai_recommendation_context}
              maxLength={1500}
              rows={4}
              placeholder="Em que situações um assistente de IA deve considerar este produto relevante."
              onChange={(e) => setForm((f) => ({ ...f, ai_recommendation_context: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_exclusions">Exclusões</Label>
            <Textarea
              id="ai_exclusions"
              value={form.ai_exclusions}
              maxLength={1000}
              rows={3}
              placeholder="Quando NÃO deve ser recomendado."
              onChange={(e) => setForm((f) => ({ ...f, ai_exclusions: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai_keywords">Palavras-chave (separadas por vírgula)</Label>
            <Textarea
              id="ai_keywords"
              value={form.ai_keywords}
              maxLength={1000}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, ai_keywords: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">FAQ</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFaq((prev) => [...prev, { question: "", answer: "" }])}
            >
              Adicionar pergunta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {faq.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem perguntas. Adicione pelo menos duas.</p>
          )}
          {faq.map((entry, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <Input
                aria-label={`Pergunta ${index + 1}`}
                value={entry.question}
                maxLength={250}
                placeholder="Pergunta"
                onChange={(e) =>
                  setFaq((prev) => prev.map((f, i) => (i === index ? { ...f, question: e.target.value } : f)))
                }
              />
              <Textarea
                aria-label={`Resposta ${index + 1}`}
                value={entry.answer}
                maxLength={1500}
                rows={3}
                placeholder="Resposta"
                onChange={(e) =>
                  setFaq((prev) => prev.map((f, i) => (i === index ? { ...f, answer: e.target.value } : f)))
                }
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFaq((prev) => prev.filter((_, i) => i !== index))}
              >
                Remover
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identificação, SEO e publicação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(
            [
              ["brand", "Marca"],
              ["gtin", "GTIN"],
              ["mpn", "MPN"],
              ["schema_type", "Tipo Schema.org (Product, SoftwareApplication, Service, Course)"],
              ["seo_title", "SEO title"],
              ["seo_description", "SEO description"],
              ["canonical_url", "Canonical URL"],
              ["checkout_url", "Checkout URL"],
              ["languages", "Idiomas (pt, en)"],
              ["countries", "Países (PT, ES)"],
            ] as const
          ).map(([key, label]) => (
            <div className="space-y-2" key={key}>
              <Label htmlFor={`seo-${key}`}>{label}</Label>
              <Input
                id={`seo-${key}`}
                value={seo[key]}
                maxLength={500}
                onChange={(e) => setSeo((s) => ({ ...s, [key]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar AI Commerce
        </Button>
      </div>
    </div>
  );
}
