/**
 * Assistente IA do formulário de produto — motor AI Commerce.
 *
 * Substitui o assistente legado: gera conteúdo estruturado (título comercial,
 * descrições, benefícios, funcionalidades, público-alvo, casos de uso, FAQ,
 * palavras-chave e SEO) a partir dos dados reais do produto/rascunho.
 * Nunca sugere preços, stock, GTIN ou MPN.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Check, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface AICommerceSuggestion {
  ai_title: string;
  ai_category: string;
  ai_short_description: string;
  ai_long_description: string;
  ai_target_audience: string;
  ai_problem_solved: string;
  ai_use_cases: string[];
  ai_key_features: string[];
  ai_keywords: string[];
  ai_recommendation_context: string;
  ai_exclusions: string;
  ai_faq: { question: string; answer: string }[];
  seo_title: string;
  seo_description: string;
  main_benefits: string[];
  schema_type: string;
  canonical_url: string;
  checkout_url: string;
  languages: string[];
  countries: string[];
}

export interface AICommerceDraftInput {
  name: string;
  sku?: string;
  brand?: string;
  category?: string;
  productType?: string;
  shortDescription?: string;
  commercialDescription?: string;
}

interface Props {
  productId?: string;
  draft: AICommerceDraftInput;
  onApplyName: (value: string) => void;
  onApplyCategory: (value: string) => void;
  onApplyShortDescription: (value: string) => void;
  /** Recebe o conteúdo estruturado que será guardado no produto + AI Commerce. */
  onApplyStructured: (suggestion: AICommerceSuggestion) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  rate_limited: "Demasiados pedidos seguidos. Aguarde alguns segundos e tente novamente.",
  no_credits: "Sem créditos de IA disponíveis neste momento.",
  ai_not_configured: "A IA não está configurada.",
  invalid_product: "Indique primeiro o nome do produto (mínimo 3 caracteres).",
  not_found: "Produto não encontrado.",
};

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** Nº de blocos preenchidos / total — leitura rápida da qualidade do conteúdo. */
function completeness(s: AICommerceSuggestion): number {
  const checks = [
    !!s.ai_title,
    !!s.ai_short_description,
    s.ai_long_description.length >= 200,
    !!s.ai_category,
    s.main_benefits.length >= 3,
    s.ai_key_features.length >= 3,
    s.ai_use_cases.length >= 3,
    !!s.ai_target_audience,
    !!s.ai_problem_solved,
    s.ai_keywords.length >= 5,
    s.ai_faq.length >= 3,
    !!s.seo_title,
    !!s.seo_description,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function AICommerceAssistantPanel({
  productId,
  draft,
  onApplyName,
  onApplyCategory,
  onApplyShortDescription,
  onApplyStructured,
}: Props) {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<AICommerceSuggestion | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const markApplied = (key: string) => setApplied((prev) => new Set(prev).add(key));

  const generate = async () => {
    if (!draft.name || draft.name.trim().length < 3) {
      toast.error("Escreva primeiro o nome do produto");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-commerce-autofill", {
        body: productId
          ? { productId, baseUrl: getPublicBaseUrl() }
          : {
              baseUrl: getPublicBaseUrl(),
              draft: { ...draft, workspaceId: currentWorkspace?.id },
            },
      });
      const code = (data as { error?: string } | null)?.error;
      if (fnError || code || !(data as { suggestion?: AICommerceSuggestion })?.suggestion) {
        const message =
          (code && ERROR_MESSAGES[code]) ||
          fnError?.message ||
          "Não foi possível gerar conteúdo agora.";
        setError(message);
        return;
      }
      const next = (data as { suggestion: AICommerceSuggestion }).suggestion;
      setSuggestion(next);
      setApplied(new Set());
    } catch (e) {
      console.error("[AICommerceAssistantPanel] generate failed", e);
      setError("Não foi possível gerar conteúdo agora.");
    } finally {
      setLoading(false);
    }
  };

  const applyAll = () => {
    if (!suggestion) return;
    if (suggestion.ai_title) onApplyName(suggestion.ai_title);
    if (suggestion.ai_category) onApplyCategory(suggestion.ai_category);
    if (suggestion.ai_short_description) onApplyShortDescription(suggestion.ai_short_description);
    onApplyStructured(suggestion);
    setApplied(new Set(["name", "category", "short", "structured"]));
    toast.success("Conteúdo AI Commerce aplicado");
  };

  return (
    <Card className="p-4 space-y-4 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Assistente IA</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            AI Commerce
          </Badge>
        </div>
        {suggestion && (
          <span className="text-xs text-muted-foreground">
            Conteúdo {completeness(suggestion)}%
          </span>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        className="w-full"
        onClick={generate}
        disabled={loading || !draft.name || draft.name.trim().length < 3}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> A gerar conteúdo...
          </>
        ) : (
          <>
            <Wand2 className="h-3.5 w-3.5 mr-2" />
            {suggestion ? "Gerar novamente" : "Preencher com IA (AI Commerce)"}
          </>
        )}
      </Button>

      {!suggestion && !loading && !error && (
        <p className="text-xs text-muted-foreground">
          Gera título comercial, descrições, benefícios, funcionalidades, público-alvo, casos de uso,
          FAQ e SEO. Os preços são sempre definidos por si — a IA nunca os sugere.
        </p>
      )}

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2" role="alert">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {suggestion && !loading && (
        <div className="space-y-4">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={applyAll}>
            {applied.has("structured") ? (
              <>
                <Check className="h-3.5 w-3.5 mr-2" /> Aplicado
              </>
            ) : (
              "Aplicar tudo na ficha"
            )}
          </Button>

          {suggestion.ai_title && (
            <Block label="Título comercial">
              <p className="text-sm bg-muted/50 rounded p-2">{suggestion.ai_title}</p>
              <Button
                type="button"
                variant={applied.has("name") ? "secondary" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  onApplyName(suggestion.ai_title);
                  markApplied("name");
                }}
              >
                {applied.has("name") ? (
                  <>
                    <Check className="h-3 w-3 mr-1" /> Aplicado
                  </>
                ) : (
                  "Aplicar no nome"
                )}
              </Button>
            </Block>
          )}

          {suggestion.ai_category && (
            <Block label="Categoria sugerida">
              <Badge
                variant="outline"
                className={`cursor-pointer rounded-full ${applied.has("category") ? "border-primary text-primary" : "hover:border-primary/40"}`}
                onClick={() => {
                  onApplyCategory(suggestion.ai_category);
                  markApplied("category");
                }}
              >
                {applied.has("category") && <Check className="h-3 w-3 mr-1" />}
                {suggestion.ai_category}
              </Badge>
            </Block>
          )}

          {suggestion.ai_short_description && (
            <Block label="Descrição curta">
              <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                {suggestion.ai_short_description}
              </p>
              <Button
                type="button"
                variant={applied.has("short") ? "secondary" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  onApplyShortDescription(suggestion.ai_short_description);
                  markApplied("short");
                }}
              >
                {applied.has("short") ? (
                  <>
                    <Check className="h-3 w-3 mr-1" /> Aplicada
                  </>
                ) : (
                  "Aplicar na descrição"
                )}
              </Button>
            </Block>
          )}

          {suggestion.ai_long_description && (
            <Block label="Descrição comercial">
              <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-h-32 overflow-y-auto whitespace-pre-line">
                {suggestion.ai_long_description}
              </p>
            </Block>
          )}

          {suggestion.main_benefits.length > 0 && (
            <Block label="Benefícios">
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                {suggestion.main_benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Block>
          )}

          {suggestion.ai_key_features.length > 0 && (
            <Block label="Funcionalidades">
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                {suggestion.ai_key_features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Block>
          )}

          {(suggestion.ai_target_audience || suggestion.ai_problem_solved) && (
            <Block label="Público-alvo e problema">
              {suggestion.ai_target_audience && (
                <p className="text-xs text-muted-foreground">{suggestion.ai_target_audience}</p>
              )}
              {suggestion.ai_problem_solved && (
                <p className="text-xs text-muted-foreground">{suggestion.ai_problem_solved}</p>
              )}
            </Block>
          )}

          {suggestion.ai_use_cases.length > 0 && (
            <Block label="Casos de uso">
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                {suggestion.ai_use_cases.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </Block>
          )}

          {suggestion.ai_faq.length > 0 && (
            <Block label={`FAQ (${suggestion.ai_faq.length})`}>
              <div className="space-y-2">
                {suggestion.ai_faq.map((f) => (
                  <div key={f.question} className="rounded border border-border p-2">
                    <p className="text-xs font-medium">{f.question}</p>
                    <p className="text-xs text-muted-foreground">{f.answer}</p>
                  </div>
                ))}
              </div>
            </Block>
          )}

          {(suggestion.seo_title || suggestion.seo_description) && (
            <Block label="SEO">
              {suggestion.seo_title && <p className="text-xs font-medium">{suggestion.seo_title}</p>}
              {suggestion.seo_description && (
                <p className="text-xs text-muted-foreground">{suggestion.seo_description}</p>
              )}
            </Block>
          )}

          {suggestion.ai_keywords.length > 0 && (
            <Block label="Palavras-chave">
              <div className="flex flex-wrap gap-1.5">
                {suggestion.ai_keywords.map((k) => (
                  <Badge key={k} variant="outline" className="rounded-full text-[10px]">
                    {k}
                  </Badge>
                ))}
              </div>
            </Block>
          )}

          <p className="text-[11px] text-muted-foreground">
            Conteúdo guardado na ficha e na camada AI Commerce ao gravar o produto.
          </p>
        </div>
      )}
    </Card>
  );
}
