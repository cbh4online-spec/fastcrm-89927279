import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Info, Blocks, Eye } from "lucide-react";
import { ProposalContentBlocks } from "./ProposalContentBlocks";
import type { ProposalTemplate, ContentBlock } from "@/types/proposal";

interface ProposalTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ProposalTemplate | null;
  onSave: (data: {
    name: string;
    description: string;
    content_blocks: ContentBlock[];
    cta_text: string;
    cta_color: string;
  }) => Promise<void>;
  isSaving?: boolean;
}

export function ProposalTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSave,
  isSaving = false,
}: ProposalTemplateFormDialogProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [ctaText, setCtaText] = useState("Aceitar Proposta");
  const [ctaColor, setCtaColor] = useState("#3b82f6");

  const isEditing = !!template;

  // Reset form when dialog opens/closes or template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name || "");
        setDescription(template.description || "");
        setBlocks((template.content_blocks as ContentBlock[]) || []);
        setCtaText(template.cta_text || "Aceitar Proposta");
        setCtaColor(template.cta_color || "#3b82f6");
      } else {
        setName("");
        setDescription("");
        setBlocks([]);
        setCtaText("Aceitar Proposta");
        setCtaColor("#3b82f6");
      }
      setActiveTab("info");
    }
  }, [open, template]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await onSave({
      name: name.trim(),
      description: description.trim(),
      content_blocks: blocks,
      cta_text: ctaText,
      cta_color: ctaColor,
    });
  };

  const canSave = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Modelo" : "Novo Modelo de Proposta"}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="gap-2">
              <Info className="h-4 w-4" />
              Informação
            </TabsTrigger>
            <TabsTrigger value="blocks" className="gap-2">
              <Blocks className="h-4 w-4" />
              Blocos
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Pré-visualizar
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 mt-4">
            <TabsContent value="info" className="m-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Modelo *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Proposta de Serviços de Marketing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva quando usar este modelo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cta-text">Texto do Botão CTA</Label>
                  <Input
                    id="cta-text"
                    placeholder="Aceitar Proposta"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta-color">Cor do Botão CTA</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cta-color"
                      type="color"
                      value={ctaColor}
                      onChange={(e) => setCtaColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={ctaColor}
                      onChange={(e) => setCtaColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="blocks" className="m-0">
              <ProposalContentBlocks blocks={blocks} onChange={setBlocks} />
            </TabsContent>

            <TabsContent value="preview" className="m-0">
              <div className="border rounded-lg p-6 bg-muted/30 min-h-[300px]">
                {blocks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <p>Adicione blocos de conteúdo para ver a pré-visualização.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {blocks.map((block) => (
                      <PreviewBlock key={block.id} block={block} />
                    ))}
                    <div className="text-center pt-4">
                      <Button
                        style={{ backgroundColor: ctaColor }}
                        className="px-8"
                      >
                        {ctaText}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSave || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Guardar Alterações" : "Criar Modelo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewBlock({ block }: { block: ContentBlock }) {
  const content = block.content;

  switch (block.type) {
    case "text":
      return (
        <div className="space-y-2">
          {content.title && (
            <h3 className="text-lg font-semibold">{content.title as string}</h3>
          )}
          {content.body && (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {content.body as string}
            </p>
          )}
        </div>
      );

    case "image":
      return (
        <div className="space-y-2">
          {content.url ? (
            <img
              src={content.url as string}
              alt={(content.alt as string) || ""}
              className="max-w-full h-auto rounded-lg"
            />
          ) : (
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              Imagem
            </div>
          )}
          {content.caption && (
            <p className="text-sm text-muted-foreground text-center">
              {content.caption as string}
            </p>
          )}
        </div>
      );

    case "offer":
      return (
        <div className="border rounded-lg p-4 space-y-3">
          {content.title && (
            <h3 className="text-lg font-semibold">{content.title as string}</h3>
          )}
          {content.description && (
            <p className="text-muted-foreground">
              {content.description as string}
            </p>
          )}
          {(content.features as string[])?.length > 0 && (
            <ul className="space-y-1">
              {(content.features as string[]).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          )}
          {content.price && (
            <p className="text-2xl font-bold text-primary">
              {content.price as string}
            </p>
          )}
        </div>
      );

    case "testimonials":
      return (
        <div className="space-y-3">
          {content.title && (
            <h3 className="text-lg font-semibold">{content.title as string}</h3>
          )}
          {(content.items as Array<{ author: string; text: string; role?: string }>)?.map(
            (item, i) => (
              <blockquote key={i} className="border-l-2 pl-4 italic">
                <p>"{item.text}"</p>
                <footer className="text-sm text-muted-foreground mt-1">
                  — {item.author}
                  {item.role && `, ${item.role}`}
                </footer>
              </blockquote>
            )
          )}
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          {content.title && (
            <h3 className="text-lg font-semibold">{content.title as string}</h3>
          )}
          {(content.items as Array<{ question: string; answer: string }>)?.map(
            (item, i) => (
              <div key={i} className="space-y-1">
                <p className="font-medium">{item.question}</p>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            )
          )}
        </div>
      );

    case "divider":
      return content.style === "dots" ? (
        <div className="text-center text-muted-foreground">• • •</div>
      ) : content.style === "space" ? (
        <div className="h-8" />
      ) : (
        <hr className="border-muted" />
      );

    case "cta":
      return (
        <div className="text-center">
          <Button variant={content.style === "outline" ? "outline" : "default"}>
            {(content.text as string) || "Botão"}
          </Button>
        </div>
      );

    default:
      return null;
  }
}
