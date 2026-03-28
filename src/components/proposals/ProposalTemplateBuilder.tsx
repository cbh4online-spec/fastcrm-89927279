import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Eye, Loader2, Trash2, GripVertical, Copy,
  ChevronUp, ChevronDown, Type, Image, DollarSign, Quote,
  HelpCircle, Minus, MousePointer, Table, Users, Shield,
  Video, BarChart3, PenTool, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import {
  useProposalTemplates,
  useCreateProposalTemplate,
  useUpdateProposalTemplate,
} from "@/hooks/useProposals";
import { useGenerateProposalCopy } from "@/hooks/useGenerateProposalCopy";
import { BlockPalette } from "./template-builder/BlockPalette";
import { StyleSettings, defaultStyles, type TemplateStyles } from "./template-builder/StyleSettings";
import { VariablesPicker } from "./template-builder/VariablesPicker";
import { BlockAIButton } from "./template-builder/BlockAIButton";
import type { ContentBlock, ProposalTemplate } from "@/types/proposal";

const generateId = () => Math.random().toString(36).substring(2, 11);

const blockTypeInfo: Record<string, { label: string; icon: typeof Type }> = {
  text: { label: "Texto", icon: Type },
  image: { label: "Imagem", icon: Image },
  offer: { label: "Oferta", icon: DollarSign },
  testimonials: { label: "Depoimentos", icon: Quote },
  faq: { label: "FAQ", icon: HelpCircle },
  divider: { label: "Divisor", icon: Minus },
  cta: { label: "CTA", icon: MousePointer },
  pricing_table: { label: "Tabela de Preços", icon: Table },
  team: { label: "Equipa", icon: Users },
  guarantee: { label: "Garantia", icon: Shield },
  video: { label: "Vídeo", icon: Video },
  metrics: { label: "Métricas", icon: BarChart3 },
  signature: { label: "Assinatura", icon: PenTool },
};

function getDefaultContent(type: ContentBlock["type"]): Record<string, unknown> {
  switch (type) {
    case "text": return { title: "", body: "" };
    case "image": return { url: "", alt: "", caption: "" };
    case "offer": return { title: "Nossa Oferta", description: "", price: "{{opportunity.value}}", features: [] };
    case "testimonials": return { title: "O que nossos clientes dizem", items: [] };
    case "faq": return { title: "Perguntas Frequentes", items: [] };
    case "divider": return { style: "line" };
    case "cta": return { text: "Aceitar Proposta", style: "primary" };
    case "pricing_table": return { title: "Investimento", items: [{ description: "", qty: 1, unitPrice: 0 }], showVat: true, vatRate: 23 };
    case "team": return { title: "A Nossa Equipa", members: [{ name: "", role: "", photoUrl: "" }] };
    case "guarantee": return { title: "A Nossa Garantia", icon: "shield", text: "" };
    case "video": return { url: "", caption: "" };
    case "metrics": return { title: "Resultados", items: [{ value: "", label: "" }] };
    case "signature": return { title: "Assinatura", signerLabel: "O Cliente", dateLabel: "Data" };
    default: return {};
  }
}

export function ProposalTemplateBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";

  const { data: templates } = useProposalTemplates();
  const createTemplate = useCreateProposalTemplate();
  const updateTemplate = useUpdateProposalTemplate();
  const { generateCopy, isLoading: aiLoading } = useGenerateProposalCopy();
  const [aiLoadingBlockId, setAiLoadingBlockId] = useState<string | null>(null);

  const existingTemplate = !isNew && templates?.find((t) => t.id === id);

  const [name, setName] = useState(existingTemplate?.name || "");
  const [description, setDescription] = useState(existingTemplate?.description || "");
  const [ctaText, setCtaText] = useState(existingTemplate?.cta_text || "Aceitar Proposta");
  const [ctaColor, setCtaColor] = useState(existingTemplate?.cta_color || "#2563eb");
  const [blocks, setBlocks] = useState<ContentBlock[]>(
    (existingTemplate?.content_blocks as ContentBlock[]) || []
  );
  const [styles, setStyles] = useState<TemplateStyles>(
    (existingTemplate?.styles as unknown as TemplateStyles) || defaultStyles
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState("blocks");
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when template loads
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (existingTemplate && existingTemplate.id !== loadedId) {
    setLoadedId(existingTemplate.id);
    setName(existingTemplate.name);
    setDescription(existingTemplate.description || "");
    setCtaText(existingTemplate.cta_text);
    setCtaColor(existingTemplate.cta_color);
    setBlocks((existingTemplate.content_blocks as ContentBlock[]) || []);
    setStyles((existingTemplate.styles as unknown as TemplateStyles) || defaultStyles);
  }

  const addBlock = useCallback((type: ContentBlock["type"]) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      content: getDefaultContent(type),
      order: blocks.length,
    };
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, [blocks.length]);

  const updateBlock = useCallback((id: string, content: Record<string, unknown>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [selectedBlockId]);

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if ((direction === "up" && idx === 0) || (direction === "down" && idx === prev.length - 1)) return prev;
      const newBlocks = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx], newBlocks[idx]];
      return newBlocks.map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const dup = { ...prev[idx], id: generateId() };
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next.map((b, i) => ({ ...b, order: i }));
    });
  }, []);

  const handleAIGenerate = useCallback(async (blockType: ContentBlock["type"], blockId: string) => {
    setAiLoadingBlockId(blockId);
    try {
      const result = await generateCopy(
        { dealTitle: name, offerDescription: description },
        "comercial",
        blockType === "offer" ? ["offer"] : blockType === "cta" ? ["cta"] : blockType === "testimonials" ? ["testimonial"] : ["intro"]
      );
      if (result) {
        const block = blocks.find((b) => b.id === blockId);
        if (!block) return;
        let newContent = { ...block.content };
        if (blockType === "text" && result.intro) {
          newContent = { ...newContent, title: result.intro.title, body: result.intro.body };
        } else if (blockType === "offer" && result.offer) {
          newContent = { ...newContent, title: result.offer.title, description: result.offer.description, features: result.offer.features };
        } else if (blockType === "cta" && result.cta) {
          newContent = { ...newContent, text: result.cta.text };
        } else if (blockType === "testimonials" && result.testimonial) {
          newContent = { ...newContent, items: [{ author: result.testimonial.author, text: result.testimonial.quote, role: result.testimonial.role }] };
        } else if (result.intro) {
          newContent = { ...newContent, title: result.intro.title, text: result.intro.body };
        }
        updateBlock(blockId, newContent);
        toast.success("Conteúdo gerado com IA!");
      }
    } finally {
      setAiLoadingBlockId(null);
    }
  }, [blocks, generateCopy, name, description, updateBlock]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("O nome do modelo é obrigatório.");
      return;
    }
    setIsSaving(true);
    try {
      if (isNew) {
        await createTemplate.mutateAsync({
          name,
          description: description || undefined,
          content_blocks: blocks,
          styles: styles as unknown as Record<string, unknown>,
          cta_text: ctaText,
          cta_color: ctaColor,
        });
        toast.success("Modelo criado com sucesso!");
      } else if (existingTemplate) {
        await updateTemplate.mutateAsync({
          id: existingTemplate.id,
          name,
          description,
          content_blocks: blocks,
          styles: styles as unknown as Record<string, unknown>,
          cta_text: ctaText,
          cta_color: ctaColor,
        });
        toast.success("Modelo guardado!");
      }
      navigate("/dashboard/proposals?tab=templates");
    } catch {
      toast.error("Erro ao guardar modelo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
  };

  const spacingClass = styles.spacing === "compact" ? "gap-2" : styles.spacing === "spacious" ? "gap-8" : "gap-4";

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/proposals?tab=templates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do modelo..."
              className="h-8 text-sm font-medium border-none bg-transparent focus-visible:ring-1 w-[250px]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            {showPreview ? "Ocultar" : "Preview"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[220px] border-r bg-muted/30 shrink-0 flex flex-col">
          <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex flex-col h-full">
            <TabsList className="grid grid-cols-3 mx-2 mt-2">
              <TabsTrigger value="blocks" className="text-[11px]">Blocos</TabsTrigger>
              <TabsTrigger value="styles" className="text-[11px]">Estilos</TabsTrigger>
              <TabsTrigger value="vars" className="text-[11px]">Vars</TabsTrigger>
            </TabsList>
            <div className="flex-1 overflow-auto p-3">
              <TabsContent value="blocks" className="mt-0">
                <BlockPalette onAddBlock={addBlock} />
              </TabsContent>
              <TabsContent value="styles" className="mt-0">
                <StyleSettings styles={styles} onChange={setStyles} />
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label className="text-xs">Descrição do Modelo</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição breve..."
                    rows={2}
                    className="text-xs"
                  />
                  <Label className="text-xs">Texto CTA</Label>
                  <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="h-8 text-xs" />
                  <Label className="text-xs">Cor CTA</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="w-8 h-8 rounded border cursor-pointer" />
                    <Input value={ctaColor} onChange={(e) => setCtaColor(e.target.value)} className="h-8 text-xs flex-1" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="vars" className="mt-0">
                <VariablesPicker onInsert={handleInsertVariable} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Center Editor */}
        <div className="flex-1 overflow-auto bg-muted/10">
          <ScrollArea className="h-full">
            <div className="max-w-2xl mx-auto p-6 space-y-3">
              {blocks.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                  <div className="text-muted-foreground space-y-2">
                    <Type className="h-12 w-12 mx-auto opacity-20" />
                    <h3 className="font-medium">Comece a construir</h3>
                    <p className="text-sm">Adicione blocos a partir da barra lateral esquerda.</p>
                  </div>
                </Card>
              ) : (
                blocks.map((block, index) => {
                  const info = blockTypeInfo[block.type] || { label: block.type, icon: Type };
                  const Icon = info.icon;
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <Card
                      key={block.id}
                      className={`p-3 cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary/50 border-primary/30" : "hover:border-primary/20"}`}
                      onClick={() => setSelectedBlockId(block.id)}
                    >
                      {/* Block Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === 0} onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "up"); }}>
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={index === blocks.length - 1} onClick={(e) => { e.stopPropagation(); moveBlock(block.id, "down"); }}>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">{info.label}</span>
                        <div className="ml-auto flex items-center gap-1">
                          <BlockAIButton
                            block={block}
                            templateName={name}
                            templateDescription={description}
                            onGenerated={(content) => updateBlock(block.id, content)}
                            isLoading={aiLoadingBlockId === block.id}
                            onGenerateRequest={handleAIGenerate}
                          />
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Block Editor */}
                      <BuilderBlockEditor
                        block={block}
                        onUpdate={(content) => updateBlock(block.id, content)}
                      />
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Preview */}
        {showPreview && (
          <div className="w-[380px] border-l bg-background shrink-0 flex flex-col">
            <div className="px-3 py-2 border-b flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Live Preview</span>
            </div>
            <ScrollArea className="flex-1">
              <div
                className="p-6 space-y-4"
                style={{
                  backgroundColor: styles.backgroundColor,
                  color: styles.textColor,
                  fontFamily: styles.fontBody,
                }}
              >
                {styles.logoUrl && (
                  <div className="mb-4">
                    <img src={styles.logoUrl} alt="Logo" className="h-8 object-contain" />
                  </div>
                )}
                <div className={`flex flex-col ${spacingClass}`}>
                  {blocks.map((block) => (
                    <PreviewBlock key={block.id} block={block} styles={styles} ctaText={ctaText} ctaColor={ctaColor} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Block Editor (inline) ──────────────────────────────────────────────

function BuilderBlockEditor({ block, onUpdate }: { block: ContentBlock; onUpdate: (content: Record<string, unknown>) => void }) {
  const c = block.content;

  switch (block.type) {
    case "text":
      return (
        <div className="space-y-2">
          <Input placeholder="Título" value={(c.title as string) || ""} onChange={(e) => onUpdate({ ...c, title: e.target.value })} className="h-8 text-sm" />
          <Textarea placeholder="Corpo do texto... Use {{variavel}} para dados dinâmicos" value={(c.body as string) || ""} onChange={(e) => onUpdate({ ...c, body: e.target.value })} rows={3} className="text-sm" />
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          <Input placeholder="URL da imagem" value={(c.url as string) || ""} onChange={(e) => onUpdate({ ...c, url: e.target.value })} className="h-8 text-sm" />
          <Input placeholder="Texto alternativo" value={(c.alt as string) || ""} onChange={(e) => onUpdate({ ...c, alt: e.target.value })} className="h-8 text-sm" />
        </div>
      );
    case "offer":
      return (
        <div className="space-y-2">
          <Input placeholder="Título da oferta" value={(c.title as string) || ""} onChange={(e) => onUpdate({ ...c, title: e.target.value })} className="h-8 text-sm" />
          <Textarea placeholder="Descrição" value={(c.description as string) || ""} onChange={(e) => onUpdate({ ...c, description: e.target.value })} rows={2} className="text-sm" />
          <Input placeholder="Preço" value={(c.price as string) || ""} onChange={(e) => onUpdate({ ...c, price: e.target.value })} className="h-8 text-sm" />
          <InlineListEditor items={(c.features as string[]) || []} onChange={(features) => onUpdate({ ...c, features })} placeholder="Adicionar feature" />
        </div>
      );
    case "pricing_table":
      return <PricingTableEditor content={c} onUpdate={onUpdate} />;
    case "team":
      return <TeamEditor content={c} onUpdate={onUpdate} />;
    case "guarantee":
      return (
        <div className="space-y-2">
          <Input placeholder="Título da garantia" value={(c.title as string) || ""} onChange={(e) => onUpdate({ ...c, title: e.target.value })} className="h-8 text-sm" />
          <Textarea placeholder="Texto da garantia / SLA..." value={(c.text as string) || ""} onChange={(e) => onUpdate({ ...c, text: e.target.value })} rows={2} className="text-sm" />
        </div>
      );
    case "video":
      return (
        <div className="space-y-2">
          <Input placeholder="URL do vídeo (YouTube/Vimeo)" value={(c.url as string) || ""} onChange={(e) => onUpdate({ ...c, url: e.target.value })} className="h-8 text-sm" />
          <Input placeholder="Legenda (opcional)" value={(c.caption as string) || ""} onChange={(e) => onUpdate({ ...c, caption: e.target.value })} className="h-8 text-sm" />
        </div>
      );
    case "metrics":
      return <MetricsEditor content={c} onUpdate={onUpdate} />;
    case "testimonials":
      return (
        <div className="space-y-2">
          <Input placeholder="Título da secção" value={(c.title as string) || ""} onChange={(e) => onUpdate({ ...c, title: e.target.value })} className="h-8 text-sm" />
          {((c.items as Array<{ author: string; text: string; role?: string }>) || []).map((item, i) => (
            <Card key={i} className="p-2 space-y-1">
              <div className="flex gap-2">
                <Input placeholder="Nome" value={item.author} onChange={(e) => { const items = [...(c.items as any[])]; items[i] = { ...item, author: e.target.value }; onUpdate({ ...c, items }); }} className="h-7 text-xs" />
                <Input placeholder="Cargo" value={item.role || ""} onChange={(e) => { const items = [...(c.items as any[])]; items[i] = { ...item, role: e.target.value }; onUpdate({ ...c, items }); }} className="h-7 text-xs" />
              </div>
              <Textarea placeholder="Testemunho" value={item.text} onChange={(e) => { const items = [...(c.items as any[])]; items[i] = { ...item, text: e.target.value }; onUpdate({ ...c, items }); }} rows={2} className="text-xs" />
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => { const items = (c.items as any[]).filter((_, idx) => idx !== i); onUpdate({ ...c, items }); }}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ ...c, items: [...((c.items as any[]) || []), { author: "", text: "", role: "" }] })}>+ Depoimento</Button>
        </div>
      );
    case "faq":
      return (
        <div className="space-y-2">
          <Input placeholder="Título" value={(c.title as string) || ""} onChange={(e) => onUpdate({ ...c, title: e.target.value })} className="h-8 text-sm" />
          {((c.items as Array<{ question: string; answer: string }>) || []).map((item, i) => (
            <Card key={i} className="p-2 space-y-1">
              <Input placeholder="Pergunta" value={item.question} onChange={(e) => { const items = [...(c.items as any[])]; items[i] = { ...item, question: e.target.value }; onUpdate({ ...c, items }); }} className="h-7 text-xs" />
              <Textarea placeholder="Resposta" value={item.answer} onChange={(e) => { const items = [...(c.items as any[])]; items[i] = { ...item, answer: e.target.value }; onUpdate({ ...c, items }); }} rows={2} className="text-xs" />
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => { const items = (c.items as any[]).filter((_, idx) => idx !== i); onUpdate({ ...c, items }); }}>Remover</Button>
            </Card>
          ))}
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ ...c, items: [...((c.items as any[]) || []), { question: "", answer: "" }] })}>+ Pergunta</Button>
        </div>
      );
    case "divider":
      return (
        <div className="flex gap-1">
          {["line", "dots", "space"].map((style) => (
            <Button key={style} variant={c.style === style ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => onUpdate({ style })}>
              {style === "line" ? "Linha" : style === "dots" ? "Pontos" : "Espaço"}
            </Button>
          ))}
        </div>
      );
    case "cta":
      return (
        <div className="space-y-2">
          <Input placeholder="Texto do botão" value={(c.text as string) || ""} onChange={(e) => onUpdate({ ...c, text: e.target.value })} className="h-8 text-sm" />
          <div className="flex gap-1">
            {["primary", "secondary", "outline"].map((style) => (
              <Button key={style} variant={c.style === style ? "default" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => onUpdate({ ...c, style })}>
                {style === "primary" ? "Primário" : style === "secondary" ? "Secundário" : "Contorno"}
              </Button>
            ))}
          </div>
        </div>
      );
    case "signature":
      return (
        <div className="space-y-2">
          <Input placeholder="Título" value={(c.title as string) || ""} onChange={(e) => onUpdate({ ...c, title: e.target.value })} className="h-8 text-sm" />
          <Input placeholder="Label do signatário" value={(c.signerLabel as string) || ""} onChange={(e) => onUpdate({ ...c, signerLabel: e.target.value })} className="h-8 text-sm" />
        </div>
      );
    default:
      return <p className="text-xs text-muted-foreground">Bloco não suportado</p>;
  }
}

// ─── Sub-editors ────────────────────────────────────────────────────────

function InlineListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1 items-center">
          <Input value={item} onChange={(e) => { const u = [...items]; u[i] = e.target.value; onChange(u); }} className="h-7 text-xs" />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onChange(items.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      <div className="flex gap-1">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className="h-7 text-xs" onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onChange([...items, val.trim()]); setVal(""); } }} />
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { if (val.trim()) { onChange([...items, val.trim()]); setVal(""); } }}>+</Button>
      </div>
    </div>
  );
}

function PricingTableEditor({ content, onUpdate }: { content: Record<string, unknown>; onUpdate: (c: Record<string, unknown>) => void }) {
  const items = (content.items as Array<{ description: string; qty: number; unitPrice: number }>) || [];
  const vatRate = (content.vatRate as number) || 23;

  return (
    <div className="space-y-2">
      <Input placeholder="Título" value={(content.title as string) || ""} onChange={(e) => onUpdate({ ...content, title: e.target.value })} className="h-8 text-sm" />
      <div className="space-y-1">
        <div className="grid grid-cols-[1fr_60px_80px_30px] gap-1 text-[10px] font-medium text-muted-foreground px-1">
          <span>Descrição</span><span>Qtd</span><span>Preço Unit.</span><span />
        </div>
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_60px_80px_30px] gap-1">
            <Input value={item.description} onChange={(e) => { const u = [...items]; u[i] = { ...item, description: e.target.value }; onUpdate({ ...content, items: u }); }} className="h-7 text-xs" />
            <Input type="number" value={item.qty} onChange={(e) => { const u = [...items]; u[i] = { ...item, qty: Number(e.target.value) }; onUpdate({ ...content, items: u }); }} className="h-7 text-xs" />
            <Input type="number" value={item.unitPrice} onChange={(e) => { const u = [...items]; u[i] = { ...item, unitPrice: Number(e.target.value) }; onUpdate({ ...content, items: u }); }} className="h-7 text-xs" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdate({ ...content, items: items.filter((_, idx) => idx !== i) })}><Trash2 className="h-3 w-3" /></Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ ...content, items: [...items, { description: "", qty: 1, unitPrice: 0 }] })}>+ Linha</Button>
      <div className="flex items-center gap-2">
        <Label className="text-xs">IVA %</Label>
        <Input type="number" value={vatRate} onChange={(e) => onUpdate({ ...content, vatRate: Number(e.target.value) })} className="h-7 text-xs w-20" />
      </div>
    </div>
  );
}

function TeamEditor({ content, onUpdate }: { content: Record<string, unknown>; onUpdate: (c: Record<string, unknown>) => void }) {
  const members = (content.members as Array<{ name: string; role: string; photoUrl: string }>) || [];
  return (
    <div className="space-y-2">
      <Input placeholder="Título" value={(content.title as string) || ""} onChange={(e) => onUpdate({ ...content, title: e.target.value })} className="h-8 text-sm" />
      {members.map((m, i) => (
        <div key={i} className="flex gap-1">
          <Input placeholder="Nome" value={m.name} onChange={(e) => { const u = [...members]; u[i] = { ...m, name: e.target.value }; onUpdate({ ...content, members: u }); }} className="h-7 text-xs" />
          <Input placeholder="Cargo" value={m.role} onChange={(e) => { const u = [...members]; u[i] = { ...m, role: e.target.value }; onUpdate({ ...content, members: u }); }} className="h-7 text-xs" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdate({ ...content, members: members.filter((_, idx) => idx !== i) })}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ ...content, members: [...members, { name: "", role: "", photoUrl: "" }] })}>+ Membro</Button>
    </div>
  );
}

function MetricsEditor({ content, onUpdate }: { content: Record<string, unknown>; onUpdate: (c: Record<string, unknown>) => void }) {
  const items = (content.items as Array<{ value: string; label: string }>) || [];
  return (
    <div className="space-y-2">
      <Input placeholder="Título" value={(content.title as string) || ""} onChange={(e) => onUpdate({ ...content, title: e.target.value })} className="h-8 text-sm" />
      {items.map((item, i) => (
        <div key={i} className="flex gap-1">
          <Input placeholder="Valor (ex: 500+)" value={item.value} onChange={(e) => { const u = [...items]; u[i] = { ...item, value: e.target.value }; onUpdate({ ...content, items: u }); }} className="h-7 text-xs w-24" />
          <Input placeholder="Label" value={item.label} onChange={(e) => { const u = [...items]; u[i] = { ...item, label: e.target.value }; onUpdate({ ...content, items: u }); }} className="h-7 text-xs flex-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdate({ ...content, items: items.filter((_, idx) => idx !== i) })}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ ...content, items: [...items, { value: "", label: "" }] })}>+ Métrica</Button>
    </div>
  );
}

// ─── Preview Block ──────────────────────────────────────────────────────

function PreviewBlock({ block, styles, ctaText, ctaColor }: { block: ContentBlock; styles: TemplateStyles; ctaText: string; ctaColor: string }) {
  const c = block.content;

  switch (block.type) {
    case "text":
      return (
        <div>
          {c.title && <h3 className="font-semibold text-base mb-1" style={{ fontFamily: styles.fontHeading }}>{c.title as string}</h3>}
          <p className="text-sm opacity-80 whitespace-pre-wrap">{(c.body as string) || ""}</p>
        </div>
      );
    case "image":
      return (c.url as string) ? (
        <img src={c.url as string} alt={(c.alt as string) || ""} className="rounded-lg w-full object-cover max-h-48" />
      ) : (
        <div className="h-24 bg-muted/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground">Imagem</div>
      );
    case "offer":
      return (
        <div className="border rounded-lg p-4" style={{ borderColor: styles.primaryColor + "40" }}>
          <h3 className="font-semibold mb-1" style={{ fontFamily: styles.fontHeading, color: styles.primaryColor }}>{(c.title as string) || "Oferta"}</h3>
          <p className="text-xs opacity-70 mb-2">{(c.description as string) || ""}</p>
          {((c.features as string[]) || []).map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs mb-0.5">
              <span style={{ color: styles.primaryColor }}>✓</span> {f}
            </div>
          ))}
          {c.price && <p className="text-lg font-bold mt-2" style={{ color: styles.primaryColor }}>{c.price as string}</p>}
        </div>
      );
    case "pricing_table": {
      const items = (c.items as Array<{ description: string; qty: number; unitPrice: number }>) || [];
      const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
      const vat = subtotal * ((c.vatRate as number) || 23) / 100;
      return (
        <div className="border rounded-lg overflow-hidden">
          {c.title && <div className="px-3 py-2 font-semibold text-sm" style={{ backgroundColor: styles.primaryColor + "10", fontFamily: styles.fontHeading }}>{c.title as string}</div>}
          <table className="w-full text-xs">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="px-3 py-1.5">Item</th><th className="px-2 py-1.5 w-12">Qtd</th><th className="px-2 py-1.5 w-16 text-right">Preço</th><th className="px-3 py-1.5 w-16 text-right">Total</th></tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b"><td className="px-3 py-1.5">{item.description || "—"}</td><td className="px-2 py-1.5">{item.qty}</td><td className="px-2 py-1.5 text-right">{item.unitPrice.toFixed(2)}€</td><td className="px-3 py-1.5 text-right font-medium">{(item.qty * item.unitPrice).toFixed(2)}€</td></tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-b"><td colSpan={3} className="px-3 py-1 text-right text-muted-foreground">Subtotal</td><td className="px-3 py-1 text-right">{subtotal.toFixed(2)}€</td></tr>
              <tr className="border-b"><td colSpan={3} className="px-3 py-1 text-right text-muted-foreground">IVA ({(c.vatRate as number) || 23}%)</td><td className="px-3 py-1 text-right">{vat.toFixed(2)}€</td></tr>
              <tr><td colSpan={3} className="px-3 py-1.5 text-right font-semibold">Total</td><td className="px-3 py-1.5 text-right font-bold" style={{ color: styles.primaryColor }}>{(subtotal + vat).toFixed(2)}€</td></tr>
            </tfoot>
          </table>
        </div>
      );
    }
    case "team": {
      const members = (c.members as Array<{ name: string; role: string; photoUrl: string }>) || [];
      return (
        <div>
          {c.title && <h3 className="font-semibold text-sm mb-2" style={{ fontFamily: styles.fontHeading }}>{c.title as string}</h3>}
          <div className="grid grid-cols-2 gap-2">
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg border">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium" style={{ color: styles.primaryColor }}>
                  {m.name?.charAt(0) || "?"}
                </div>
                <div>
                  <p className="text-xs font-medium">{m.name || "Nome"}</p>
                  <p className="text-[10px] text-muted-foreground">{m.role || "Cargo"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "guarantee":
      return (
        <div className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: styles.primaryColor + "30", backgroundColor: styles.primaryColor + "05" }}>
          <Shield className="h-5 w-5 shrink-0 mt-0.5" style={{ color: styles.primaryColor }} />
          <div>
            <h4 className="text-sm font-semibold" style={{ fontFamily: styles.fontHeading }}>{(c.title as string) || "Garantia"}</h4>
            <p className="text-xs opacity-70 mt-0.5">{(c.text as string) || ""}</p>
          </div>
        </div>
      );
    case "video":
      return (
        <div className="rounded-lg overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
          {(c.url as string) ? (
            <div className="text-center">
              <Video className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{c.url as string}</p>
            </div>
          ) : (
            <Video className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      );
    case "metrics": {
      const items = (c.items as Array<{ value: string; label: string }>) || [];
      return (
        <div>
          {c.title && <h3 className="font-semibold text-sm mb-2" style={{ fontFamily: styles.fontHeading }}>{c.title as string}</h3>}
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, i) => (
              <div key={i} className="text-center p-2 rounded-lg border">
                <p className="text-lg font-bold" style={{ color: styles.primaryColor }}>{item.value || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{item.label || "Label"}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "testimonials": {
      const items = (c.items as Array<{ author: string; text: string; role?: string }>) || [];
      return (
        <div>
          {c.title && <h3 className="font-semibold text-sm mb-2" style={{ fontFamily: styles.fontHeading }}>{c.title as string}</h3>}
          {items.map((item, i) => (
            <div key={i} className="border-l-2 pl-3 mb-2" style={{ borderColor: styles.primaryColor }}>
              <p className="text-xs italic">"{item.text}"</p>
              <p className="text-[10px] font-medium mt-1">{item.author}{item.role ? ` — ${item.role}` : ""}</p>
            </div>
          ))}
        </div>
      );
    }
    case "faq": {
      const items = (c.items as Array<{ question: string; answer: string }>) || [];
      return (
        <div>
          {c.title && <h3 className="font-semibold text-sm mb-2" style={{ fontFamily: styles.fontHeading }}>{c.title as string}</h3>}
          {items.map((item, i) => (
            <div key={i} className="mb-2">
              <p className="text-xs font-medium">{item.question}</p>
              <p className="text-[10px] opacity-70">{item.answer}</p>
            </div>
          ))}
        </div>
      );
    }
    case "divider":
      return c.style === "dots" ? (
        <div className="text-center text-muted-foreground tracking-widest">• • •</div>
      ) : c.style === "space" ? (
        <div className="h-6" />
      ) : (
        <Separator />
      );
    case "cta":
      return (
        <div className="text-center py-2">
          <button className="px-6 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: ctaColor }}>
            {(c.text as string) || ctaText}
          </button>
        </div>
      );
    case "signature":
      return (
        <div className="border-t pt-4 mt-4">
          <p className="text-xs font-medium mb-4">{(c.title as string) || "Assinatura"}</p>
          <div className="flex gap-8">
            <div className="flex-1">
              <div className="h-12 border-b border-dashed" />
              <p className="text-[10px] text-muted-foreground mt-1">{(c.signerLabel as string) || "O Cliente"}</p>
            </div>
            <div className="w-32">
              <div className="h-12 border-b border-dashed" />
              <p className="text-[10px] text-muted-foreground mt-1">{(c.dateLabel as string) || "Data"}</p>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}
