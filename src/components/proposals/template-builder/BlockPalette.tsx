import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Type, Image, DollarSign, Quote, HelpCircle, Minus, MousePointer,
  Table, Users, Shield, Video, BarChart3, PenTool
} from "lucide-react";
import type { ContentBlock } from "@/types/proposal";

const blockCategories = [
  {
    label: "Conteúdo",
    blocks: [
      { type: "text", label: "Texto", icon: Type, description: "Título e corpo de texto" },
      { type: "image", label: "Imagem", icon: Image, description: "Imagem com legenda" },
      { type: "video", label: "Vídeo", icon: Video, description: "Embed YouTube/Vimeo" },
      { type: "divider", label: "Divisor", icon: Minus, description: "Separador visual" },
    ]
  },
  {
    label: "Comercial",
    blocks: [
      { type: "offer", label: "Oferta", icon: DollarSign, description: "Oferta com features" },
      { type: "pricing_table", label: "Tabela de Preços", icon: Table, description: "Itens, qtd, preço, total" },
      { type: "cta", label: "Botão CTA", icon: MousePointer, description: "Call-to-action" },
      { type: "metrics", label: "Métricas/KPIs", icon: BarChart3, description: "Números de impacto" },
    ]
  },
  {
    label: "Credibilidade",
    blocks: [
      { type: "testimonials", label: "Depoimentos", icon: Quote, description: "Testemunhos de clientes" },
      { type: "team", label: "Equipa", icon: Users, description: "Membros da equipa" },
      { type: "guarantee", label: "Garantia", icon: Shield, description: "Garantia ou SLA" },
      { type: "faq", label: "FAQ", icon: HelpCircle, description: "Perguntas frequentes" },
    ]
  },
  {
    label: "Fecho",
    blocks: [
      { type: "signature", label: "Assinatura", icon: PenTool, description: "Espaço para assinatura" },
    ]
  }
];

interface BlockPaletteProps {
  onAddBlock: (type: ContentBlock["type"]) => void;
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div className="space-y-4">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Blocos
      </Label>
      <ScrollArea className="h-[400px]">
        <div className="space-y-4 pr-2">
          {blockCategories.map((category) => (
            <div key={category.label}>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">{category.label}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {category.blocks.map((block) => {
                  const Icon = block.icon;
                  return (
                    <Button
                      key={block.type}
                      variant="outline"
                      size="sm"
                      className="h-auto py-2 px-2 flex flex-col items-center gap-1 text-[11px] hover:bg-primary/5 hover:border-primary/30"
                      onClick={() => onAddBlock(block.type as ContentBlock["type"])}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate w-full text-center">{block.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
