/**
 * Etiquetas inteligentes em massa.
 *
 * Para cada produto selecionado, calcula etiquetas a partir de dados reais
 * (nome, marca, modelo, categoria, especificações e conteúdo AI Commerce já
 * validado) usando a estratégia determinística de `tagStrategy`. Nunca inventa
 * etiquetas comerciais e nunca guarda sem aprovação explícita.
 */
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Tags, Info, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  buildTagSuggestions,
  type TagPurpose,
} from "@/lib/ai-commerce/tagStrategy";

export interface BulkTagsTarget {
  id: string;
  name: string;
  sku?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  category?: string | null;
  subcategory?: string | null;
  specifications?: Record<string, string> | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targets: BulkTagsTarget[];
  onComplete?: () => void;
}

const PURPOSES: { id: TagPurpose; label: string; hint: string }[] = [
  { id: "identificacao", label: "Identificação", hint: "Marca, modelo, categoria" },
  { id: "tecnologia", label: "Tecnologia", hint: "Especificações técnicas reais" },
  { id: "uso", label: "Utilização", hint: "Onde e para quem serve" },
  { id: "seo", label: "Pesquisa", hint: "Termos usados pelos clientes" },
];

const MAX_PER_PRODUCT = 12;

interface Computed {
  id: string;
  name: string;
  tags: string[];
}

export function BulkTagsDialog({ open, onOpenChange, targets, onComplete }: Props) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [purposes, setPurposes] = useState<TagPurpose[]>([
    "identificacao",
    "tecnologia",
    "uso",
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [specs, setSpecs] = useState<Record<string, { spec_key: string; spec_value: string }[]>>({});
  const [aiContent, setAiContent] = useState<Record<string, any>>({});
  const [existing, setExisting] = useState<Record<string, string[]>>({});
  const [applied, setApplied] = useState<number | null>(null);

  useEffect(() => {
    if (!open || targets.length === 0) return;
    let cancelled = false;
    setApplied(null);
    setLoading(true);
    const ids = targets.map((t) => t.id);
    (async () => {
      const [specRes, aiRes, tagRes] = await Promise.all([
        (supabase as any)
          .from("product_spec_attributes")
          .select("product_id, spec_key, spec_value")
          .in("product_id", ids),
        (supabase as any)
          .from("product_ai_commerce")
          .select("product_id, ai_target_audience, ai_use_cases, ai_keywords, ai_key_features")
          .in("product_id", ids),
        (supabase as any).from("product_tags").select("product_id, tag").in("product_id", ids),
      ]);
      if (cancelled) return;
      const specMap: Record<string, { spec_key: string; spec_value: string }[]> = {};
      for (const row of specRes.data || []) {
        (specMap[row.product_id] ||= []).push({ spec_key: row.spec_key, spec_value: row.spec_value });
      }
      const aiMap: Record<string, any> = {};
      for (const row of aiRes.data || []) aiMap[row.product_id] = row;
      const tagMap: Record<string, string[]> = {};
      for (const row of tagRes.data || []) (tagMap[row.product_id] ||= []).push(row.tag);
      setSpecs(specMap);
      setAiContent(aiMap);
      setExisting(tagMap);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, targets]);

  const computed = useMemo<Computed[]>(() => {
    if (loading) return [];
    return targets.map((t) => {
      const ai = aiContent[t.id];
      const groups = buildTagSuggestions(
        {
          name: t.name,
          brand: t.brand,
          manufacturer: t.manufacturer,
          model: t.model,
          category: t.category,
          subcategory: t.subcategory,
          specifications: t.specifications || null,
          specAttributes: specs[t.id] || [],
          idealFor: ai?.ai_target_audience ? [ai.ai_target_audience] : null,
          useCases: ai?.ai_use_cases || null,
          searchTerms: [...(ai?.ai_keywords || []), ...(ai?.ai_key_features || [])],
        },
        existing[t.id] || []
      );
      const tags: string[] = [];
      for (const g of groups) {
        if (!purposes.includes(g.purpose)) continue;
        for (const tag of g.tags) {
          if (!tags.includes(tag)) tags.push(tag);
        }
      }
      return { id: t.id, name: t.name, tags: tags.slice(0, MAX_PER_PRODUCT) };
    });
  }, [targets, specs, aiContent, existing, purposes, loading]);

  const totalTags = computed.reduce((acc, c) => acc + c.tags.length, 0);
  const withTags = computed.filter((c) => c.tags.length > 0).length;

  const togglePurpose = (p: TagPurpose) =>
    setPurposes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const handleApply = async () => {
    if (!currentWorkspace?.id || totalTags === 0) return;
    setSaving(true);
    setProgress(0);
    const rows = computed.flatMap((c) =>
      c.tags.map((tag) => ({
        workspace_id: currentWorkspace.id,
        product_id: c.id,
        tag,
      }))
    );
    let inserted = 0;
    const CHUNK = 200;
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { error } = await (supabase as any)
          .from("product_tags")
          .upsert(chunk, { onConflict: "product_id,tag", ignoreDuplicates: true });
        if (error) throw error;
        inserted += chunk.length;
        setProgress(Math.round((inserted / rows.length) * 100));
      }
      setApplied(inserted);
      queryClient.invalidateQueries({ queryKey: ["workspace-tags"] });
      queryClient.invalidateQueries({ queryKey: ["product-tags"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${inserted} etiqueta(s) aplicadas em ${withTags} produto(s)`);
      onComplete?.();
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível aplicar as etiquetas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="h-4 w-4" /> Etiquetas inteligentes em massa
          </DialogTitle>
          <DialogDescription>
            {targets.length} produto(s) selecionado(s). As etiquetas saem dos dados reais de
            cada ficha — nada é inventado nem guardado sem a sua aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PURPOSES.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg border p-3"
              >
                <Checkbox
                  checked={purposes.includes(p.id)}
                  onCheckedChange={() => togglePurpose(p.id)}
                  disabled={saving}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-xs text-muted-foreground">{p.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Estas etiquetas alimentam os filtros da loja online e as pesquisas com
              inteligência artificial. Produtos sem dados suficientes ficam de fora.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2 text-sm">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> A analisar fichas…
              </>
            ) : (
              <>
                <Badge variant="secondary">{withTags} produto(s) com propostas</Badge>
                <Badge variant="outline">{totalTags} etiqueta(s) no total</Badge>
              </>
            )}
          </div>

          {saving && <Progress value={progress} />}

          {applied !== null && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {applied} etiqueta(s) guardadas. Já pode filtrar por elas na loja.
              </AlertDescription>
            </Alert>
          )}

          <ScrollArea className="h-64 rounded-lg border">
            <div className="divide-y">
              {computed.map((c) => (
                <div key={c.id} className="space-y-1.5 p-3">
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.tags.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Sem dados suficientes para propor etiquetas.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {c.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[11px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Fechar
          </Button>
          <Button onClick={handleApply} disabled={saving || loading || totalTags === 0}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Aplicar {totalTags > 0 ? `${totalTags} etiqueta(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
