import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  GripVertical,
  Type,
  Image,
  DollarSign,
  Quote,
  HelpCircle,
  Minus,
  MousePointer,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContentBlock } from "@/types/proposal";

interface ProposalContentBlocksProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  variables?: Record<string, string>;
}

const blockTypes = [
  { type: "text", label: "Texto", icon: Type },
  { type: "image", label: "Imagem", icon: Image },
  { type: "offer", label: "Oferta/Preço", icon: DollarSign },
  { type: "testimonials", label: "Depoimentos", icon: Quote },
  { type: "faq", label: "FAQ", icon: HelpCircle },
  { type: "divider", label: "Divisor", icon: Minus },
  { type: "cta", label: "Botão CTA", icon: MousePointer },
] as const;

const generateId = () => Math.random().toString(36).substring(2, 11);

export function ProposalContentBlocks({
  blocks,
  onChange,
  variables = {},
}: ProposalContentBlocksProps) {
  const addBlock = (type: ContentBlock["type"]) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      content: getDefaultContent(type),
      order: blocks.length,
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: Record<string, unknown>) => {
    onChange(
      blocks.map((b) => (b.id === id ? { ...b, content } : b))
    );
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    const index = blocks.findIndex((b) => b.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[swapIndex]] = [
      newBlocks[swapIndex],
      newBlocks[index],
    ];
    onChange(newBlocks.map((b, i) => ({ ...b, order: i })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Blocos de Conteúdo</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Bloco
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {blockTypes.map(({ type, label, icon: Icon }) => (
              <DropdownMenuItem
                key={type}
                onClick={() => addBlock(type as ContentBlock["type"])}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        {blocks.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Nenhum bloco adicionado.</p>
            <p className="text-sm">Clique em "Adicionar Bloco" para começar.</p>
          </Card>
        ) : (
          blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              variables={variables}
              onUpdate={(content) => updateBlock(block.id, content)}
              onRemove={() => removeBlock(block.id)}
              onMove={(dir) => moveBlock(block.id, dir)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function getDefaultContent(type: ContentBlock["type"]): Record<string, unknown> {
  switch (type) {
    case "text":
      return { title: "", body: "" };
    case "image":
      return { url: "", alt: "", caption: "" };
    case "offer":
      return {
        title: "Nossa Oferta",
        description: "",
        price: "{{opportunity.value}}",
        features: [],
      };
    case "testimonials":
      return {
        title: "O que nossos clientes dizem",
        items: [],
      };
    case "faq":
      return {
        title: "Perguntas Frequentes",
        items: [],
      };
    case "divider":
      return { style: "line" };
    case "cta":
      return { text: "Aceitar Proposta", style: "primary" };
    default:
      return {};
  }
}

interface BlockEditorProps {
  block: ContentBlock;
  index: number;
  total: number;
  variables: Record<string, string>;
  onUpdate: (content: Record<string, unknown>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}

function BlockEditor({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: BlockEditorProps) {
  const blockType = blockTypes.find((t) => t.type === block.type);
  const Icon = blockType?.icon || Type;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === 0}
            onClick={() => onMove("up")}
          >
            <GripVertical className="h-4 w-4 rotate-90" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={index === total - 1}
            onClick={() => onMove("down")}
          >
            <GripVertical className="h-4 w-4 rotate-90" />
          </Button>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{blockType?.label}</span>
          </div>

          <BlockContentEditor block={block} onUpdate={onUpdate} />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function BlockContentEditor({
  block,
  onUpdate,
}: {
  block: ContentBlock;
  onUpdate: (content: Record<string, unknown>) => void;
}) {
  const content = block.content;

  switch (block.type) {
    case "text":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Título (opcional)"
            value={(content.title as string) || ""}
            onChange={(e) => onUpdate({ ...content, title: e.target.value })}
          />
          <Textarea
            placeholder="Conteúdo do texto... Use {{variavel}} para dados dinâmicos"
            value={(content.body as string) || ""}
            onChange={(e) => onUpdate({ ...content, body: e.target.value })}
            rows={4}
          />
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <Input
            placeholder="URL da imagem"
            value={(content.url as string) || ""}
            onChange={(e) => onUpdate({ ...content, url: e.target.value })}
          />
          <Input
            placeholder="Texto alternativo"
            value={(content.alt as string) || ""}
            onChange={(e) => onUpdate({ ...content, alt: e.target.value })}
          />
          <Input
            placeholder="Legenda (opcional)"
            value={(content.caption as string) || ""}
            onChange={(e) => onUpdate({ ...content, caption: e.target.value })}
          />
        </div>
      );

    case "offer":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Título da oferta"
            value={(content.title as string) || ""}
            onChange={(e) => onUpdate({ ...content, title: e.target.value })}
          />
          <Textarea
            placeholder="Descrição da oferta"
            value={(content.description as string) || ""}
            onChange={(e) =>
              onUpdate({ ...content, description: e.target.value })
            }
            rows={2}
          />
          <Input
            placeholder="Preço (ex: R$ 1.500 ou {{opportunity.value}})"
            value={(content.price as string) || ""}
            onChange={(e) => onUpdate({ ...content, price: e.target.value })}
          />
          <FeaturesEditor
            features={(content.features as string[]) || []}
            onChange={(features) => onUpdate({ ...content, features })}
          />
        </div>
      );

    case "testimonials":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Título da seção"
            value={(content.title as string) || ""}
            onChange={(e) => onUpdate({ ...content, title: e.target.value })}
          />
          <TestimonialsEditor
            items={
              (content.items as Array<{
                author: string;
                text: string;
                role?: string;
              }>) || []
            }
            onChange={(items) => onUpdate({ ...content, items })}
          />
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Título da seção"
            value={(content.title as string) || ""}
            onChange={(e) => onUpdate({ ...content, title: e.target.value })}
          />
          <FAQEditor
            items={
              (content.items as Array<{ question: string; answer: string }>) ||
              []
            }
            onChange={(items) => onUpdate({ ...content, items })}
          />
        </div>
      );

    case "divider":
      return (
        <div className="flex gap-2">
          {["line", "dots", "space"].map((style) => (
            <Button
              key={style}
              variant={content.style === style ? "default" : "outline"}
              size="sm"
              onClick={() => onUpdate({ style })}
            >
              {style === "line" ? "Linha" : style === "dots" ? "Pontos" : "Espaço"}
            </Button>
          ))}
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3">
          <Input
            placeholder="Texto do botão"
            value={(content.text as string) || ""}
            onChange={(e) => onUpdate({ ...content, text: e.target.value })}
          />
          <div className="flex gap-2">
            {["primary", "secondary", "outline"].map((style) => (
              <Button
                key={style}
                variant={content.style === style ? "default" : "outline"}
                size="sm"
                onClick={() => onUpdate({ ...content, style })}
              >
                {style === "primary"
                  ? "Primário"
                  : style === "secondary"
                  ? "Secundário"
                  : "Contorno"}
              </Button>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

function FeaturesEditor({
  features,
  onChange,
}: {
  features: string[];
  onChange: (features: string[]) => void;
}) {
  const [newFeature, setNewFeature] = useState("");

  const addFeature = () => {
    if (newFeature.trim()) {
      onChange([...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Características incluídas</Label>
      {features.map((feature, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={feature}
            onChange={(e) => {
              const updated = [...features];
              updated[i] = e.target.value;
              onChange(updated);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange(features.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          placeholder="Nova característica"
          value={newFeature}
          onChange={(e) => setNewFeature(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addFeature()}
        />
        <Button variant="outline" size="sm" onClick={addFeature}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TestimonialsEditor({
  items,
  onChange,
}: {
  items: Array<{ author: string; text: string; role?: string }>;
  onChange: (
    items: Array<{ author: string; text: string; role?: string }>
  ) => void;
}) {
  const addItem = () => {
    onChange([...items, { author: "", text: "", role: "" }]);
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <Card key={i} className="p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do autor"
              value={item.author}
              onChange={(e) => {
                const updated = [...items];
                updated[i] = { ...item, author: e.target.value };
                onChange(updated);
              }}
            />
            <Input
              placeholder="Cargo/Empresa"
              value={item.role || ""}
              onChange={(e) => {
                const updated = [...items];
                updated[i] = { ...item, role: e.target.value };
                onChange(updated);
              }}
            />
          </div>
          <Textarea
            placeholder="Depoimento"
            value={item.text}
            onChange={(e) => {
              const updated = [...items];
              updated[i] = { ...item, text: e.target.value };
              onChange(updated);
            }}
            rows={2}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </Button>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Depoimento
      </Button>
    </div>
  );
}

function FAQEditor({
  items,
  onChange,
}: {
  items: Array<{ question: string; answer: string }>;
  onChange: (items: Array<{ question: string; answer: string }>) => void;
}) {
  const addItem = () => {
    onChange([...items, { question: "", answer: "" }]);
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <Card key={i} className="p-3 space-y-2">
          <Input
            placeholder="Pergunta"
            value={item.question}
            onChange={(e) => {
              const updated = [...items];
              updated[i] = { ...item, question: e.target.value };
              onChange(updated);
            }}
          />
          <Textarea
            placeholder="Resposta"
            value={item.answer}
            onChange={(e) => {
              const updated = [...items];
              updated[i] = { ...item, answer: e.target.value };
              onChange(updated);
            }}
            rows={2}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </Button>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Pergunta
      </Button>
    </div>
  );
}
