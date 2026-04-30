import { useState, useCallback, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { ScanText, FileText, ClipboardList, Sparkles, MessageSquare, CheckCircle2, ChevronLeft, ChevronRight, Cloud, CloudOff, Loader2, History } from "lucide-react";
import { useOCRWizardAutoSave } from "@/hooks/useOCRWizardAutoSave";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { StepUpload } from "@/components/products/ocr/StepUpload";
import { StepReviewOCR } from "@/components/products/ocr/StepReviewOCR";
import { StepProductSheet } from "@/components/products/ocr/StepProductSheet";
import { StepContent } from "@/components/products/ocr/StepContent";
import { StepSalesSupport } from "@/components/products/ocr/StepSalesSupport";
import { StepSummary } from "@/components/products/ocr/StepSummary";
import {
  emptyContent,
  emptyProductSheet,
  emptySalesSupport,
  type OCRDocument,
  type OCRStructuredData,
  type ProductContentData,
  type ProductSheetData,
  type SalesSupportData,
} from "@/components/products/ocr/types";
import { buildSpecsFromStructured } from "@/components/products/ocr/buildSpecsFromStructured";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCreditWallet } from "@/hooks/useCreditWallet";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";

const OCR_GENERATE_CONTENT_ACTION = "product_ocr_generate_content";

const STEPS = [
  { id: 1, title: "Upload", icon: FileText, desc: "Carregar documento" },
  { id: 2, title: "Leitura OCR", icon: ScanText, desc: "Rever extração" },
  { id: 3, title: "Ficha técnica", icon: ClipboardList, desc: "Dados do produto" },
  { id: 4, title: "Conteúdo", icon: Sparkles, desc: "Loja e catálogo" },
  { id: 5, title: "Argumentário", icon: MessageSquare, desc: "Apoio à venda" },
  { id: 6, title: "Resumo", icon: CheckCircle2, desc: "Validar e criar" },
];

export default function ProductOCRCreate() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [doc, setDoc] = useState<OCRDocument | null>(null);
  const [structured, setStructured] = useState<OCRStructuredData | null>(null);
  const [sheet, setSheet] = useState<ProductSheetData>(emptyProductSheet());
  const [content, setContent] = useState<ProductContentData>(emptyContent());
  const [sales, setSales] = useState<SalesSupportData>(emptySalesSupport());
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);
  const { getCost, canAfford, consumeCredits } = useCreditWallet();
  const generateContentCost = getCost(OCR_GENERATE_CONTENT_ACTION);

  // ---------------------------------------------------------------
  // RECUPERAÇÃO DE RASCUNHO
  // (a) ?doc=<id> → carrega esse documento específico
  // (b) sem ?doc, ao montar → procura rascunho recente (<24h) deste workspace
  //     e propõe ao utilizador retomar onde ficou.
  // ---------------------------------------------------------------
  const hydrateFromDocumentId = useCallback(async (docId: string) => {
    setRestoring(true);
    try {
      const { data, error } = await supabase
        .from("product_ocr_documents")
        .select("*")
        .eq("id", docId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Rascunho não encontrado.");
        return;
      }
      if (data.product_id) {
        toast.info("Este documento já gerou um produto.");
        navigate(`/dashboard/products?highlight=${data.product_id}`);
        return;
      }
      // restaurar OCRDocument + structured
      const restoredDoc = {
        id: data.id,
        file_name: data.file_name,
        file_type: data.file_type,
        file_url: data.file_url,
        file_path: data.file_path,
        ocr_confidence: data.ocr_confidence,
        field_confidence: (data.field_confidence ?? {}) as Record<string, number>,
        ocr_raw_text: data.ocr_raw_text,
      } as unknown as OCRDocument;
      setDoc(restoredDoc);
      if (data.ocr_structured_data) {
        setStructured(data.ocr_structured_data as unknown as OCRStructuredData);
      }
      const ws = (data.wizard_state ?? null) as null | {
        step?: number;
        sheet?: ProductSheetData;
        content?: ProductContentData;
        sales?: SalesSupportData;
        structured?: OCRStructuredData;
      };
      if (ws) {
        if (ws.sheet) setSheet({ ...emptyProductSheet(), ...ws.sheet });
        if (ws.content) setContent({ ...emptyContent(), ...ws.content });
        if (ws.sales) setSales({ ...emptySalesSupport(), ...ws.sales });
        if (ws.structured && !data.ocr_structured_data) setStructured(ws.structured);
        if (typeof ws.step === "number") setStep(Math.min(6, Math.max(1, ws.step)));
      }
      setHydratedFromDraft(true);
      toast.success("Rascunho recuperado. Podes continuar de onde parou.");
    } catch (e) {
      console.error("[OCR-Restore] failed", e);
      toast.error("Falha ao recuperar rascunho.");
    } finally {
      setRestoring(false);
    }
  }, [navigate]);

  // (a) URL com ?doc=
  useEffect(() => {
    const docId = searchParams.get("doc");
    if (docId && !doc) {
      hydrateFromDocumentId(docId);
    }
  }, [searchParams, doc, hydrateFromDocumentId]);

  // (b) sem ?doc → procurar rascunho recente
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    if (searchParams.get("doc")) return;
    if (doc || hydratedFromDraft) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("product_ocr_documents")
        .select("id, file_name, wizard_last_saved_at, wizard_state")
        .eq("workspace_id", currentWorkspace.id)
        .is("product_id", null)
        .not("wizard_state", "is", null)
        .gte("wizard_last_saved_at", since)
        .order("wizard_last_saved_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      const ws = data.wizard_state as { step?: number } | null;
      const stepNum = ws?.step ?? 1;
      const when = data.wizard_last_saved_at
        ? formatDistanceToNow(new Date(data.wizard_last_saved_at), { locale: pt, addSuffix: true })
        : "recentemente";
      toast.info(
        `Rascunho recente encontrado (passo ${stepNum}/6, ${when}).`,
        {
          duration: 12000,
          action: {
            label: "Continuar",
            onClick: () => {
              setSearchParams({ doc: data.id });
            },
          },
          cancel: {
            label: "Começar do zero",
            onClick: () => {},
          },
        },
      );
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  // Após extração, mapear automático para sheet
  const applyExtractionToSheet = useCallback((data: OCRStructuredData) => {
    setStructured(data);
    setSheet((prev) => ({
      ...prev,
      name: data.general?.name ?? prev.name,
      commercial_name: data.general?.commercial_name ?? prev.commercial_name,
      brand: data.general?.brand ?? prev.brand,
      line: data.general?.product_line ?? prev.line,
      category: data.general?.category ?? prev.category,
      subcategory: data.general?.subcategory ?? prev.subcategory,
      product_type: data.general?.product_type ?? prev.product_type,
      volume_text: data.identification?.volume ?? prev.volume_text,
      unit_of_sale: data.identification?.unit ?? prev.unit_of_sale,
      barcode: data.identification?.ean ?? prev.barcode,
      sku: data.identification?.sku ?? prev.sku,
      origin_country: data.identification?.origin_country ?? prev.origin_country,
      distributor: data.identification?.distributor ?? prev.distributor,
    }));
  }, []);

  const next = () => setStep((s) => Math.min(6, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  // ---------------------------------------------------------------
  // AUTO-SAVE (debounced) → product_ocr_documents.wizard_state
  // Só guarda enquanto o documento existe e ainda não foi convertido.
  // ---------------------------------------------------------------
  const snapshot = useMemo(() => ({
    step,
    sheet,
    content,
    sales,
    structured,
  }), [step, sheet, content, sales, structured]);

  const { status: saveStatus, lastSavedAt } = useOCRWizardAutoSave(
    doc?.id ?? null,
    snapshot,
    !!doc?.id && !creating && !restoring,
  );

  const generateContent = useCallback(async () => {
    if (!structured) {
      toast.error("Faz primeiro a leitura do documento.");
      return;
    }

    // Guard: saldo insuficiente → abrir dialog de compra de créditos
    if (generateContentCost > 0 && !canAfford(OCR_GENERATE_CONTENT_ACTION)) {
      triggerNoCreditsDialog({
        actionLabel: "Geração de Conteúdo Comercial (OCR)",
        creditsNeeded: generateContentCost,
      });
      return;
    }

    toast.loading("A gerar conteúdo comercial…", { id: "gen" });
    try {
      // Debitar créditos primeiro (idempotente por documento)
      if (generateContentCost > 0 && doc?.id) {
        await consumeCredits.mutateAsync({
          actionKey: OCR_GENERATE_CONTENT_ACTION,
          idempotencyKey: `${doc.id}:generate-content`,
          referenceType: "product_ocr_document",
          referenceId: doc.id,
          metadata: { product_name: sheet.name || null },
        });
      }

      const { data, error } = await supabase.functions.invoke("product-ocr-generate-content", {
        body: {
          product_data: { sheet, ocr: structured },
          workspace_id: currentWorkspace?.id,
          document_id: doc?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const gen = data?.generated;
      if (gen?.content) {
        setContent({
          short_title: gen.content.short_title ?? "",
          seo_title: gen.content.seo_title ?? "",
          short_description: gen.content.short_description ?? "",
          long_description: gen.content.long_description ?? "",
          benefits: gen.content.benefits ?? [],
          usage_instructions: gen.content.usage_instructions ?? "",
          precautions: gen.content.precautions ?? "",
          meta_description: gen.content.meta_description ?? "",
          seo_keywords: gen.content.seo_keywords ?? [],
          catalog_text: gen.content.catalog_text ?? "",
          proposal_text: gen.content.proposal_text ?? "",
          whatsapp_text: gen.content.whatsapp_text ?? "",
          in_store_text: gen.content.in_store_text ?? "",
          sensory_experience: gen.content.sensory_experience ?? "",
          olfactory_experience: gen.content.olfactory_experience ?? "",
          tags: gen.content.tags ?? [],
        });
      }
      if (gen?.sales_support) {
        setSales({
          positioning: gen.sales_support.positioning ?? "",
          ideal_customer: gen.sales_support.ideal_customer ?? "",
          sales_arguments: gen.sales_support.sales_arguments ?? [],
          sensory_arguments: gen.sales_support.sensory_arguments ?? [],
          olfactory_arguments: gen.sales_support.olfactory_arguments ?? [],
          how_to_explain: gen.sales_support.how_to_explain ?? "",
          faqs: gen.sales_support.faqs ?? [],
          objections: gen.sales_support.objections ?? [],
          sales_alerts: gen.sales_support.sales_alerts ?? [],
          do_not_sell_as: gen.sales_support.do_not_sell_as ?? [],
          sell_as: gen.sales_support.sell_as ?? [],
          counter_script: gen.sales_support.counter_script ?? "",
          whatsapp_script: gen.sales_support.whatsapp_script ?? "",
          in_store_script: gen.sales_support.in_store_script ?? "",
          sales_team_script: gen.sales_support.sales_team_script ?? "",
          internal_notes: gen.sales_support.internal_notes ?? "",
        });
      }
      toast.success("Conteúdo gerado com sucesso.", { id: "gen" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar conteúdo.", { id: "gen" });
    }
  }, [structured, sheet, doc?.id, generateContentCost, canAfford, consumeCredits, currentWorkspace?.id]);

  const computePendingFields = useCallback((): string[] => {
    const pending: string[] = [];
    if (!sheet.base_price) pending.push("PVP");
    if (!sheet.direct_cost) pending.push("Preço de custo");
    if (!sheet.tax_rate_estimate_pct) pending.push("IVA");
    if (!sheet.stock_quantity) pending.push("Stock inicial");
    if (sheet.is_seasonal_validation_status === "pending" && sheet.is_seasonal) pending.push("Classificação sazonal");
    if (sheet.is_cross_sell_validation_status === "pending" && sheet.is_cross_sell) pending.push("Sugestões de venda cruzada");
    if (sheet.is_kit_candidate_validation_status === "pending" && sheet.is_kit_candidate) pending.push("Sugestões de kit");
    return pending;
  }, [sheet]);

  const createProduct = useCallback(async () => {
    if (!currentWorkspace) {
      toast.error("Workspace não disponível.");
      return;
    }
    if (!sheet.name.trim()) {
      toast.error("O nome do produto é obrigatório.");
      return;
    }
    const parsedPrice = sheet.base_price ? parseFloat(sheet.base_price.replace(",", ".")) : NaN;
    if (!isFinite(parsedPrice) || parsedPrice <= 0) {
      toast.warning("PVP não preenchido — o produto será criado com PVP a 0€ e ficará marcado como pendente de revisão.", { duration: 6000 });
    }
    setCreating(true);
    try {
      // 1. Verificar EAN duplicado
      if (sheet.barcode?.trim()) {
        const { data: existing } = await supabase
          .from("products")
          .select("id, name")
          .eq("workspace_id", currentWorkspace.id)
          .eq("barcode", sheet.barcode.trim())
          .limit(1)
          .maybeSingle();
        if (existing) {
          toast.error(`Já existe um produto com EAN ${sheet.barcode}: ${existing.name}. Validar antes de criar.`);
          setCreating(false);
          return;
        }
      }

      const pendingFields = computePendingFields();
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

      const numOrNull = (v: string) => {
        if (!v) return null;
        const n = parseFloat(v.replace(",", "."));
        return isFinite(n) ? n : null;
      };
      const intOrNull = (v: string) => {
        if (!v) return null;
        const n = parseInt(v, 10);
        return isFinite(n) ? n : null;
      };
      const clamp = (v: number | null, min: number, max: number) =>
        v === null ? null : Math.min(max, Math.max(min, v));

      // 2. Criar produto (status='active' obrigatório pelo schema; flags de
      // publicação ficam todas a false → produto invisível em qualquer canal
      // até revisão manual. Marcador 'ocr_draft' em metadata).
      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .insert({
          workspace_id: currentWorkspace.id,
          name: sheet.name.trim(),
          commercial_name: sheet.commercial_name || null,
          product_type: sheet.product_type || "physical",
          status: "active",
          store_published: false,
          b2b_published: false,
          b2b_visible: false,
          sheet_published: false,
          category: sheet.category || null,
          subcategory: sheet.subcategory || null,
          line: sheet.line || null,
          short_description: content.short_description || null,
          commercial_description: content.long_description || null,
          benefits: content.benefits?.length ? content.benefits : null,
          sku: sheet.sku || null,
          barcode: sheet.barcode || null,
          volume_text: sheet.volume_text || null,
          unit_of_sale: sheet.unit_of_sale || null,
          origin_country: sheet.origin_country || null,
          distributor: sheet.distributor || null,
          direct_cost: numOrNull(sheet.direct_cost),
          base_price: numOrNull(sheet.base_price) ?? 0,
          tax_rate_estimate_pct: clamp(numOrNull(sheet.tax_rate_estimate_pct), 0, 100),
          stock_quantity: intOrNull(sheet.stock_quantity) ?? 0,
          // low_stock_threshold é NOT NULL com default 5 — não enviar null
          low_stock_threshold: intOrNull(sheet.low_stock_threshold) ?? 5,
          is_seasonal: sheet.is_seasonal,
          is_seasonal_validation_status: sheet.is_seasonal_validation_status,
          is_impulse_product: sheet.is_impulse_product,
          is_cross_sell: sheet.is_cross_sell,
          is_cross_sell_validation_status: sheet.is_cross_sell_validation_status,
          is_kit_candidate: sheet.is_kit_candidate,
          is_kit_candidate_validation_status: sheet.is_kit_candidate_validation_status,
          pending_fields: pendingFields,
          ocr_source_document_id: doc?.id ?? null,
          // tags é NOT NULL com default '{}' — usar array vazio em vez de null
          tags: content.tags?.length ? content.tags : [],
          // created_by é NOT NULL — exigir sessão antes de inserir
          created_by: userId,
          created_channel: "ocr_wizard",
          metadata: {
            ocr_draft: true,
            review_required: pendingFields.length > 0,
            ocr: {
              document_id: doc?.id,
              confidence: doc?.ocr_confidence,
              field_confidence: doc?.field_confidence,
            },
            sensory_experience: content.sensory_experience || null,
            olfactory_experience: content.olfactory_experience || null,
          },
        })
        .select("id")
        .single();
      if (prodErr) {
        console.error("[OCR-Create] products insert error", {
          code: (prodErr as any).code,
          message: prodErr.message,
          details: (prodErr as any).details,
          hint: (prodErr as any).hint,
        });
        throw prodErr;
      }
      const productId = prod.id;

      // 3. Conteúdo
      await supabase.from("product_content").insert({
        workspace_id: currentWorkspace.id,
        product_id: productId,
        short_title: content.short_title || null,
        seo_title: content.seo_title || null,
        short_description: content.short_description || null,
        long_description: content.long_description || null,
        benefits: content.benefits as unknown as Json,
        usage_instructions: content.usage_instructions || null,
        precautions: content.precautions || null,
        meta_description: content.meta_description || null,
        seo_keywords: content.seo_keywords as unknown as Json,
        catalog_text: content.catalog_text || null,
        proposal_text: content.proposal_text || null,
        whatsapp_text: content.whatsapp_text || null,
        in_store_text: content.in_store_text || null,
        sensory_experience: content.sensory_experience || null,
        olfactory_experience: content.olfactory_experience || null,
        tags: content.tags as unknown as Json,
        generated_by_ai: true,
        created_by: userId,
      });

      // 4. Sales support
      await supabase.from("product_sales_support").insert({
        workspace_id: currentWorkspace.id,
        product_id: productId,
        positioning: sales.positioning || null,
        ideal_customer: sales.ideal_customer || null,
        sales_arguments: sales.sales_arguments as unknown as Json,
        sensory_arguments: sales.sensory_arguments as unknown as Json,
        olfactory_arguments: sales.olfactory_arguments as unknown as Json,
        how_to_explain: sales.how_to_explain || null,
        faqs: sales.faqs as unknown as Json,
        objections: sales.objections as unknown as Json,
        sales_alerts: sales.sales_alerts as unknown as Json,
        do_not_sell_as: sales.do_not_sell_as as unknown as Json,
        sell_as: sales.sell_as as unknown as Json,
        counter_script: sales.counter_script || null,
        whatsapp_script: sales.whatsapp_script || null,
        in_store_script: sales.in_store_script || null,
        sales_team_script: sales.sales_team_script || null,
        internal_notes: sales.internal_notes || null,
        generated_by_ai: true,
        created_by: userId,
      });

      // 5. Specs técnicas a partir do OCR estruturado
      const specRows = buildSpecsFromStructured(currentWorkspace.id, productId, structured);
      if (specRows.length > 0) {
        const { error: specErr } = await supabase
          .from("product_spec_attributes" as any)
          .insert(specRows);
        if (specErr) {
          console.error("[OCR-Create] product_spec_attributes insert error", specErr);
          // não bloqueia: produto fica criado mesmo se specs falharem
        }
      }

      // 6. Ligar documento OCR ao produto
      if (doc?.id) {
        await supabase.from("product_ocr_documents").update({ product_id: productId }).eq("id", doc.id);
      }

      // 7. Tarefas de validação para campos pendentes
      if (pendingFields.length > 0) {
        const tasks = pendingFields.map((f) => ({
          workspace_id: currentWorkspace.id,
          product_id: productId,
          field_name: f.toLowerCase().replace(/\s+/g, "_"),
          field_label: f,
          task_type: "pending_field",
          validation_status: "pending",
          priority: "medium",
          created_by: userId,
        }));
        await supabase.from("product_validation_tasks").insert(tasks);
      }

      toast.success("Produto criado em rascunho com sucesso.");
      navigate(`/dashboard/products?highlight=${productId}&filter=ocr_draft`);
    } catch (e: any) {
      console.error("[OCR-Create] failed", e);
      const msg = e?.message || "Erro ao criar produto.";
      const detail = e?.details || e?.hint;
      toast.error(detail ? `${msg} — ${detail}` : msg);
    } finally {
      setCreating(false);
    }
  }, [currentWorkspace, sheet, content, sales, doc, structured, computePendingFields, navigate]);

  const progress = (step / 6) * 100;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Criar Produto por OCR | FastCRM</title>
      </Helmet>

      <div className="container mx-auto py-6 px-4 max-w-6xl space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Criação Inteligente de Produtos por OCR</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Carrega um PDF, rótulo, fotografia ou ficha técnica. A IA lê o documento, organiza os dados e prepara conteúdo comercial para validação.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {doc?.id && (
              <div
                className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-muted/40"
                aria-live="polite"
                title="O teu progresso é guardado automaticamente. Podes fechar esta página e retomar quando quiseres."
              >
                {saveStatus === "saving" && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> a guardar…</>)}
                {saveStatus === "saved" && lastSavedAt && (<><Cloud className="h-3.5 w-3.5 text-primary" /> guardado {formatDistanceToNow(lastSavedAt, { locale: pt, addSuffix: true })}</>)}
                {saveStatus === "error" && (<><CloudOff className="h-3.5 w-3.5 text-destructive" /> falha a guardar</>)}
                {saveStatus === "idle" && (<><Cloud className="h-3.5 w-3.5 text-muted-foreground" /> auto-save activo</>)}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/products/ocr-drafts")} className="gap-1.5">
              <History className="h-4 w-4" /> Rascunhos
            </Button>
          </div>
        </header>

        {/* Stepper */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <div key={s.id} className="flex flex-col items-center min-w-[80px] flex-1">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done
                        ? "bg-primary border-primary text-primary-foreground"
                        : active
                        ? "border-primary text-primary bg-primary/5"
                        : "border-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className={`text-xs mt-2 font-medium text-center ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {s.title}
                  </p>
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1 mt-2" />
        </Card>

        {/* Conteúdo de cada passo */}
        <div className="min-h-[400px]">
          {step === 1 && (
            <StepUpload
              workspaceId={currentWorkspace?.id ?? ""}
              currentDoc={doc}
              onUploaded={(d) => { setDoc(d); }}
              onExtracted={(d, data) => { setDoc(d); applyExtractionToSheet(data); next(); }}
            />
          )}
          {step === 2 && doc && structured && (
            <StepReviewOCR doc={doc} data={structured} onChange={setStructured} />
          )}
          {step === 3 && (
            <StepProductSheet sheet={sheet} onChange={setSheet} fieldConfidence={doc?.field_confidence ?? {}} />
          )}
          {step === 4 && (
            <StepContent content={content} onChange={setContent} onGenerate={generateContent} generateCost={generateContentCost} />
          )}
          {step === 5 && (
            <StepSalesSupport sales={sales} onChange={setSales} onGenerate={generateContent} generateCost={generateContentCost} />
          )}
          {step === 6 && (
            <StepSummary
              sheet={sheet}
              content={content}
              sales={sales}
              pendingFields={computePendingFields()}
              creating={creating}
              onCreate={createProduct}
            />
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={prev} disabled={step === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <p className="text-xs text-muted-foreground">Passo {step} de 6</p>
          {step < 6 ? (
            <Button onClick={next} disabled={step === 1 && !doc}>
              Seguinte <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={createProduct} disabled={creating}>
              {creating ? "A criar…" : "Criar Produto"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
