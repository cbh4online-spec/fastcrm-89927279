import { useState, useEffect, useCallback, useRef } from "react";
import { useBioBlocks, useCreateBioBlock, useDeleteBioBlock, useUpdateBioBlock, useReorderBioBlocks, type BioBlock, type BioBlockType } from "@/hooks/useBioBlocks";
import type { BioPage } from "@/hooks/useBioPages";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BioBlockPreviewCard } from "./BioBlockPreviewCard";
import { BioImageUploader } from "./BioImageUploader";
import { BioSmartLinkGenerator } from "./BioSmartLinkGenerator";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Link, Type, Image, MousePointerClick, Share2, Minus,
  Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  Smartphone, Monitor, Sparkles, LayoutGrid,
} from "lucide-react";

// ── Debounced Input helpers ───────────────────────────────────
function DebouncedInput({ value, onDebouncedChange, blockId, delay = 500, ...props }: {
  value: string;
  onDebouncedChange: (val: string) => void;
  blockId: string;
  delay?: number;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isTypingRef = useRef(false);

  useEffect(() => { setLocal(value); }, [blockId]);
  useEffect(() => { if (!isTypingRef.current) setLocal(value); }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocal(v);
    isTypingRef.current = true;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onDebouncedChange(v); isTypingRef.current = false; }, delay);
  }, [onDebouncedChange, delay]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return <Input {...props} value={local} onChange={handleChange} />;
}

function DebouncedTextarea({ value, onDebouncedChange, blockId, delay = 500, ...props }: {
  value: string;
  onDebouncedChange: (val: string) => void;
  blockId: string;
  delay?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const isTypingRef = useRef(false);

  useEffect(() => { setLocal(value); }, [blockId]);
  useEffect(() => { if (!isTypingRef.current) setLocal(value); }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setLocal(v);
    isTypingRef.current = true;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onDebouncedChange(v); isTypingRef.current = false; }, delay);
  }, [onDebouncedChange, delay]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <textarea
      {...props}
      value={local}
      onChange={handleChange}
      className="w-full border rounded-md p-2 text-sm min-h-[100px] bg-background"
    />
  );
}

// ── Block types config ────────────────────────────────────────
const BLOCK_TYPES: { type: BioBlockType; label: string; icon: React.ElementType; defaultContent: Record<string, unknown> }[] = [
  { type: "hero", label: "Hero", icon: Sparkles, defaultContent: { title: "Título Principal", subtitle: "Subtítulo descritivo", cta_text: "Saiba Mais", cta_url: "", icon: "Sparkles" } },
  { type: "feature", label: "Feature", icon: LayoutGrid, defaultContent: { title: "Feature", subtitle: "Descrição da feature", cta_text: "Ver mais" } },
  { type: "link", label: "Link", icon: Link, defaultContent: { url: "", text: "Meu Link", icon: "" } },
  { type: "button", label: "Botão", icon: MousePointerClick, defaultContent: { url: "", text: "Clique Aqui", style: "filled" } },
  { type: "text", label: "Texto", icon: Type, defaultContent: { text: "Escreva aqui..." } },
  { type: "image", label: "Imagem", icon: Image, defaultContent: { url: "", alt: "" } },
  { type: "social", label: "Redes Sociais", icon: Share2, defaultContent: { links: [] } },
  { type: "divider", label: "Separador", icon: Minus, defaultContent: { style: "line" } },
];

interface BioBlockEditorProps {
  pageId: string;
  page: BioPage;
}

export function BioBlockEditor({ pageId, page }: BioBlockEditorProps) {
  const { data: blocks = [] } = useBioBlocks(pageId);
  const createBlock = useCreateBioBlock();
  const deleteBlock = useDeleteBioBlock();
  const updateBlock = useUpdateBioBlock();
  const reorderBlocks = useReorderBioBlocks();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const handleAddBlock = async (type: BioBlockType) => {
    const blockDef = BLOCK_TYPES.find((bt) => bt.type === type);
    await createBlock.mutateAsync({
      bio_page_id: pageId,
      block_type: type,
      content: blockDef?.defaultContent || {},
      order_index: blocks.length,
    });
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= blocks.length) return;
    const newBlocks = blocks.map((b, i) => {
      if (i === index) return { id: b.id, order_index: swapIndex };
      if (i === swapIndex) return { id: b.id, order_index: index };
      return { id: b.id, order_index: i };
    });
    reorderBlocks.mutate({ pageId, blocks: newBlocks });
  };

  const updateContent = (block: BioBlock, key: string, value: unknown) => {
    updateBlock.mutate({
      id: block.id,
      bio_page_id: pageId,
      content: { ...block.content, [key]: value } as Record<string, unknown>,
    });
  };

  const handleSmartGenerated = (block: BioBlock, data: Record<string, string>) => {
    updateBlock.mutate({
      id: block.id,
      bio_page_id: pageId,
      content: { ...block.content, ...data } as Record<string, unknown>,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
      {/* Block Library */}
      <div className="lg:col-span-3 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Adicionar Bloco</h3>
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={() => handleAddBlock(type)}
              disabled={createBlock.isPending}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Preview - Premium Phone Frame */}
      <div className="lg:col-span-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Preview</h3>
          <div className="flex items-center gap-1">
            <Button variant={previewMode === "mobile" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setPreviewMode("mobile")}>
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
            <Button variant={previewMode === "desktop" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setPreviewMode("desktop")}>
              <Monitor className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Phone shell */}
        <div className="flex justify-center">
          <div
            className="relative rounded-[2.5rem] p-3 shadow-2xl"
            style={{
              maxWidth: previewMode === "mobile" ? 390 : "100%",
              width: "100%",
              background: "linear-gradient(145deg, hsl(var(--foreground) / 0.9), hsl(var(--foreground) / 0.95))",
            }}
          >
            {previewMode === "mobile" && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-foreground rounded-b-2xl z-10" />
            )}
            <div className="rounded-[2rem] overflow-hidden bg-background" style={{ minHeight: previewMode === "mobile" ? 680 : 500 }}>
              <ScrollArea style={{ height: previewMode === "mobile" ? 680 : 500 }}>
                <div className="p-5 pt-10 space-y-3">
                  {blocks.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-20">Adicione blocos para começar</p>
                  ) : (
                    blocks.map((block, index) => (
                      <div
                        key={block.id}
                        className={`relative group transition-all cursor-pointer ${
                          selectedBlockId === block.id ? "ring-2 ring-primary ring-offset-2 rounded-3xl" : ""
                        } ${!block.is_visible ? "opacity-40" : ""}`}
                        onClick={() => setSelectedBlockId(block.id)}
                      >
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); moveBlock(index, "up"); }} disabled={index === 0}>
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); moveBlock(index, "down"); }} disabled={index === blocks.length - 1}>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <BioBlockPreviewCard block={block} primaryColor={page.primary_color} index={index} />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="lg:col-span-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Propriedades</h3>
        {selectedBlock ? (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{selectedBlock.block_type}</Badge>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => updateBlock.mutate({ id: selectedBlock.id, bio_page_id: pageId, is_visible: !selectedBlock.is_visible })}
                  >
                    {selectedBlock.is_visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => { deleteBlock.mutate({ id: selectedBlock.id, pageId }); setSelectedBlockId(null); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <BlockProperties
                block={selectedBlock}
                onUpdate={(key, value) => updateContent(selectedBlock, key, value)}
                onSmartGenerated={(data) => handleSmartGenerated(selectedBlock, data)}
              />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Selecione um bloco para editar as suas propriedades.</p>
        )}
      </div>
    </div>
  );
}

// ── Block Properties with debounced inputs + smart link ───────
function BlockProperties({ block, onUpdate, onSmartGenerated }: {
  block: BioBlock;
  onUpdate: (key: string, value: unknown) => void;
  onSmartGenerated: (data: Record<string, string>) => void;
}) {
  const content = block.content as Record<string, string>;
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id || "";
  const supportsSmartLink = ["hero", "feature", "link", "button"].includes(block.block_type);

  return (
    <div className="space-y-4">
      {supportsSmartLink && (
        <BioSmartLinkGenerator
          blockType={block.block_type}
          workspaceId={workspaceId}
          onGenerated={onSmartGenerated}
        />
      )}
      <BlockFields block={block} content={content} onUpdate={onUpdate} workspaceId={workspaceId} />
    </div>
  );
}

function BlockFields({ block, content, onUpdate, workspaceId }: {
  block: BioBlock;
  content: Record<string, string>;
  onUpdate: (key: string, value: unknown) => void;
  workspaceId: string;
}) {
  switch (block.block_type) {
    case "hero":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Ícone</label>
            <DebouncedInput blockId={block.id} value={content.icon || "Sparkles"} onDebouncedChange={(v) => onUpdate("icon", v)} placeholder="Nome do ícone (ex: Target, Zap, Star)" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Nomes: Sparkles, Target, Zap, Star, Users, Shield, Brain, TrendingUp…</p>
          </div>
          <div>
            <label className="text-xs font-medium">Título</label>
            <DebouncedInput blockId={block.id} value={content.title || ""} onDebouncedChange={(v) => onUpdate("title", v)} placeholder="Título do bloco" />
          </div>
          <div>
            <label className="text-xs font-medium">Subtítulo</label>
            <DebouncedInput blockId={block.id} value={content.subtitle || ""} onDebouncedChange={(v) => onUpdate("subtitle", v)} placeholder="Subtítulo" />
          </div>
          <div>
            <label className="text-xs font-medium">Texto do CTA</label>
            <DebouncedInput blockId={block.id} value={content.cta_text || ""} onDebouncedChange={(v) => onUpdate("cta_text", v)} placeholder="Saiba Mais" />
          </div>
          <div>
            <label className="text-xs font-medium">URL do CTA</label>
            <DebouncedInput blockId={block.id} value={content.cta_url || ""} onDebouncedChange={(v) => onUpdate("cta_url", v)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium">Imagem de fundo</label>
            <BioImageUploader
              workspaceId={workspaceId}
              currentImage={content.bg_image || ""}
              onImageSelected={(url) => onUpdate("bg_image", url)}
              label="Escolher Imagem de Fundo"
            />
          </div>
        </div>
      );
    case "feature":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Título</label>
            <DebouncedInput blockId={block.id} value={content.title || ""} onDebouncedChange={(v) => onUpdate("title", v)} placeholder="Título do bloco" />
          </div>
          <div>
            <label className="text-xs font-medium">Subtítulo</label>
            <DebouncedInput blockId={block.id} value={content.subtitle || ""} onDebouncedChange={(v) => onUpdate("subtitle", v)} placeholder="Subtítulo" />
          </div>
          <div>
            <label className="text-xs font-medium">Texto do CTA</label>
            <DebouncedInput blockId={block.id} value={content.cta_text || ""} onDebouncedChange={(v) => onUpdate("cta_text", v)} placeholder="Saiba Mais" />
          </div>
          <div>
            <label className="text-xs font-medium">URL do CTA</label>
            <DebouncedInput blockId={block.id} value={content.cta_url || ""} onDebouncedChange={(v) => onUpdate("cta_url", v)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium">Imagem de fundo</label>
            <BioImageUploader
              workspaceId={workspaceId}
              currentImage={content.bg_image || ""}
              onImageSelected={(url) => onUpdate("bg_image", url)}
              label="Escolher Imagem de Fundo"
            />
          </div>
        </div>
      );
    case "link":
    case "button":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Texto</label>
            <DebouncedInput blockId={block.id} value={content.text || ""} onDebouncedChange={(v) => onUpdate("text", v)} placeholder="Texto do link" />
          </div>
          <div>
            <label className="text-xs font-medium">URL</label>
            <DebouncedInput blockId={block.id} value={content.url || ""} onDebouncedChange={(v) => onUpdate("url", v)} placeholder="https://..." />
          </div>
        </div>
      );
    case "text":
      return (
        <div>
          <label className="text-xs font-medium">Conteúdo</label>
          <DebouncedTextarea blockId={block.id} value={content.text || ""} onDebouncedChange={(v) => onUpdate("text", v)} />
        </div>
      );
    case "image":
      return (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Imagem</label>
            <BioImageUploader
              workspaceId={workspaceId}
              currentImage={content.url || ""}
              onImageSelected={(url) => onUpdate("url", url)}
              label="Escolher Imagem"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Alt Text</label>
            <DebouncedInput blockId={block.id} value={content.alt || ""} onDebouncedChange={(v) => onUpdate("alt", v)} placeholder="Descrição da imagem" />
          </div>
        </div>
      );
    case "social":
      return (
        <div className="space-y-3">
          {["instagram", "facebook", "twitter", "linkedin", "youtube", "tiktok"].map((network) => (
            <div key={network}>
              <label className="text-xs font-medium capitalize">{network}</label>
              <DebouncedInput
                blockId={block.id}
                value={(content as any)[network] || ""}
                onDebouncedChange={(v) => onUpdate(network, v)}
                placeholder={`URL do ${network}`}
              />
            </div>
          ))}
        </div>
      );
    case "divider":
      return <p className="text-xs text-muted-foreground">Separador visual entre blocos.</p>;
    default:
      return <p className="text-xs text-muted-foreground">Editor não disponível para este tipo de bloco.</p>;
  }
}
