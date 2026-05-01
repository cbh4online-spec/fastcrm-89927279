import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollText as ScriptIcon, MessageSquareWarning, ShieldCheck, Plus, Trash2, Save, Loader2, Sparkles, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Product } from "@/types/product";
import { DEFAULT_SALES_PLAYBOOK, isEmptyOrTemplate } from "./salesPlaybookTemplate";

interface ObjectionItem {
  objection: string;
  response: string;
}

interface SalesPlaybook {
  script: string;
  objections: ObjectionItem[];
  warranty: string;
  updated_at?: string;
}

const objectionSchema = z.object({
  objection: z.string().trim().max(500, "Máx 500 caracteres").default(""),
  response: z.string().trim().max(2000, "Máx 2000 caracteres").default(""),
});
const playbookSchema = z.object({
  script: z.string().trim().max(20000, "Máx 20.000 caracteres"),
  objections: z.array(objectionSchema).max(50, "Máximo 50 objeções"),
  warranty: z.string().trim().max(20000, "Máx 20.000 caracteres"),
});

function normalize(raw: unknown): SalesPlaybook {
  // For brand-new or legacy products without a playbook, seed the editor with
  // the standard template so the team always has a starting point to refine.
  if (isEmptyOrTemplate(raw)) {
    return {
      script: DEFAULT_SALES_PLAYBOOK.script,
      objections: DEFAULT_SALES_PLAYBOOK.objections.map((o) => ({ ...o })),
      warranty: DEFAULT_SALES_PLAYBOOK.warranty,
      updated_at: undefined,
    };
  }
  const obj = (raw && typeof raw === "object") ? raw as any : {};
  return {
    script: typeof obj.script === "string" ? obj.script : "",
    objections: Array.isArray(obj.objections)
      ? obj.objections
          .filter((o: any) => o && typeof o === "object")
          .map((o: any) => ({
            objection: typeof o.objection === "string" ? o.objection : "",
            response: typeof o.response === "string" ? o.response : "",
          }))
      : [],
    warranty: typeof obj.warranty === "string" ? obj.warranty : "",
    updated_at: typeof obj.updated_at === "string" ? obj.updated_at : undefined,
  };
}

interface Props {
  product: Product & { sales_playbook?: unknown };
}

export function ProductSalesPlaybookTab({ product }: Props) {
  const queryClient = useQueryClient();
  const initial = useMemo(() => normalize((product as any).sales_playbook), [product.id]);
  const [data, setData] = useState<SalesPlaybook>(initial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setData(initial);
    setDirty(false);
  }, [initial]);

  const isUsingTemplate = useMemo(
    () => isEmptyOrTemplate((product as any).sales_playbook),
    [product.id, (product as any).sales_playbook],
  );

  const update = <K extends keyof SalesPlaybook>(key: K, value: SalesPlaybook[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const addObjection = () =>
    update("objections", [...data.objections, { objection: "", response: "" }]);

  const updateObjection = (idx: number, field: keyof ObjectionItem, value: string) => {
    update(
      "objections",
      data.objections.map((o, i) => (i === idx ? { ...o, [field]: value } : o)),
    );
  };

  const removeObjection = (idx: number) => {
    update("objections", data.objections.filter((_, i) => i !== idx));
  };

  const save = useMutation({
    mutationFn: async () => {
      const parsed = playbookSchema.safeParse(data);
      if (!parsed.success) {
        const msg = parsed.error.errors[0]?.message ?? "Dados inválidos";
        throw new Error(msg);
      }
      // Drop empty objections to keep payload clean
      const cleaned: SalesPlaybook = {
        script: parsed.data.script,
        warranty: parsed.data.warranty,
        objections: parsed.data.objections
          .map((o) => ({ objection: o.objection ?? "", response: o.response ?? "" }))
          .filter((o) => o.objection.length > 0 || o.response.length > 0),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("products")
        .update({ sales_playbook: cleaned as any, updated_at: new Date().toISOString() })
        .eq("id", product.id);
      if (error) throw error;
      return cleaned;
    },
    onSuccess: (saved) => {
      toast.success("Procedimento guardado");
      setDirty(false);
      setData(saved);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao guardar");
    },
  });

  // ── AI generation ────────────────────────────────────────────────
  const generate = useMutation({
    mutationFn: async (section: "script" | "objections" | "warranty" | "all") => {
      const { data: res, error } = await supabase.functions.invoke("ai-product-playbook", {
        body: {
          section,
          product: {
            name: product.name,
            category: product.category ?? null,
            description: (product as any).description ?? null,
            short_description: (product as any).short_description ?? null,
            base_price: product.base_price ?? null,
            currency: product.currency ?? "EUR",
            product_type: product.product_type ?? null,
            sku: product.sku ?? null,
          },
          existing: {
            script: data.script,
            objections: data.objections,
            warranty: data.warranty,
          },
        },
      });
      if (error) throw error;
      if (res?.error && res.error !== "ok") {
        throw new Error(res.message || "Falha ao gerar com IA");
      }
      return { section, result: res?.result ?? { script: "", objections: [], warranty: "" } };
    },
    onSuccess: ({ section, result }) => {
      setData((prev) => {
        const next: SalesPlaybook = { ...prev };
        if (section === "all" || section === "script") {
          if (result.script) next.script = result.script;
        }
        if (section === "all" || section === "objections") {
          if (Array.isArray(result.objections) && result.objections.length > 0) {
            next.objections = result.objections;
          }
        }
        if (section === "all" || section === "warranty") {
          if (result.warranty) next.warranty = result.warranty;
        }
        return next;
      });
      setDirty(true);
      toast.success("Conteúdo gerado — revê e guarda");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao gerar");
    },
  });

  const isGenerating = (s: "script" | "objections" | "warranty" | "all") =>
    generate.isPending && generate.variables === s;

  const totalObjs = data.objections.length;

  return (
    <div className="space-y-4">
      {/* Sticky save bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-1 px-1 border-b">
        <div className="text-sm text-muted-foreground">
          {data.updated_at
            ? <>Última atualização: {new Date(data.updated_at).toLocaleString("pt-PT")}</>
            : <>Sem alterações guardadas</>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => generate.mutate("all")}
            disabled={generate.isPending}
            title="Gera Script, Objeções e Garantia com base na ficha do produto"
          >
            {isGenerating("all")
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar tudo com IA
          </Button>
          <Button
            size="sm"
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
          >
            {save.isPending
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <Save className="h-4 w-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Script de vendas */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScriptIcon className="h-4 w-4 text-primary" />
              Script de vendas
            </CardTitle>
            <CardDescription>
              Abordagem recomendada, perguntas-chave, gatilhos e fecho. Usado em propostas, chat e treino.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generate.mutate("script")}
            disabled={generate.isPending}
          >
            {isGenerating("script")
              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              : <Sparkles className="h-4 w-4 mr-1" />}
            Gerar com IA
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.script}
            onChange={(e) => update("script", e.target.value)}
            rows={10}
            maxLength={20000}
            placeholder={`Ex.\n1. Abertura — descobrir necessidade\n2. Argumentos diferenciadores\n3. Prova social / casos\n4. Apresentação do preço\n5. Fecho`}
            className="font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {data.script.length}/20.000
          </div>
        </CardContent>
      </Card>

      {/* Objeções */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareWarning className="h-4 w-4 text-amber-600" />
              Objeções &amp; respostas
              {totalObjs > 0 && <Badge variant="secondary">{totalObjs}</Badge>}
            </CardTitle>
            <CardDescription>
              Lista de objeções típicas e respostas validadas. Máximo 50.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generate.mutate("objections")}
              disabled={generate.isPending}
            >
              {isGenerating("objections")
                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                : <Sparkles className="h-4 w-4 mr-1" />}
              Gerar com IA
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={addObjection}
              disabled={totalObjs >= 50}
            >
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {totalObjs === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded">
              Nenhuma objeção registada. Clica em "Adicionar" para criar a primeira.
            </div>
          ) : (
            data.objections.map((o, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2 items-start p-3 rounded border bg-muted/30"
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Objeção #{idx + 1}
                  </label>
                  <Input
                    value={o.objection}
                    onChange={(e) => updateObjection(idx, "objection", e.target.value)}
                    placeholder="Ex. É demasiado caro"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Resposta sugerida
                  </label>
                  <Textarea
                    value={o.response}
                    onChange={(e) => updateObjection(idx, "response", e.target.value)}
                    placeholder="Ex. O investimento paga-se em X meses porque…"
                    rows={3}
                    maxLength={2000}
                  />
                </div>
                <div className="pt-5">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeObjection(idx)}
                    aria-label="Remover objeção"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Reclamação / Garantia */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Reclamação &amp; garantia
            </CardTitle>
            <CardDescription>
              Procedimento pós-venda: política de garantia, prazos, fluxo de reclamação e responsáveis.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generate.mutate("warranty")}
            disabled={generate.isPending}
          >
            {isGenerating("warranty")
              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              : <Sparkles className="h-4 w-4 mr-1" />}
            Gerar com IA
          </Button>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.warranty}
            onChange={(e) => update("warranty", e.target.value)}
            rows={10}
            maxLength={20000}
            placeholder={`Ex.\n• Garantia: 24 meses contra defeitos de fabrico\n• Prazo de resposta: 48h úteis\n• Canal: suporte@empresa.pt\n• Fluxo: receção → diagnóstico → resolução`}
            className="font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {data.warranty.length}/20.000
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
