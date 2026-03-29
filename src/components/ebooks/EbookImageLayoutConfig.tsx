import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyEnd,
  Maximize,
  RectangleHorizontal,
  Square,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
} from "lucide-react";
import { useState } from "react";

export type ImageSize = "small" | "medium" | "large" | "full";
export type ImagePosition = "top" | "center" | "left" | "right" | "bottom";

export interface PageTypeImageConfig {
  count: number;
  size: ImageSize;
  position: ImagePosition;
}

export interface ImageLayoutConfig {
  cover: PageTypeImageConfig;
  chapter: PageTypeImageConfig;
  content: PageTypeImageConfig;
  cta: PageTypeImageConfig;
}

export const DEFAULT_IMAGE_LAYOUT: ImageLayoutConfig = {
  cover: { count: 1, size: "full", position: "center" },
  chapter: { count: 1, size: "large", position: "top" },
  content: { count: 1, size: "medium", position: "right" },
  cta: { count: 1, size: "small", position: "left" },
};

const PAGE_TYPES: { key: keyof ImageLayoutConfig; label: string; desc: string }[] = [
  { key: "cover", label: "Capa", desc: "Página de capa do eBook" },
  { key: "chapter", label: "Capítulo", desc: "Páginas de introdução de capítulo" },
  { key: "content", label: "Conteúdo", desc: "Páginas de texto / conteúdo" },
  { key: "cta", label: "CTA / Autor", desc: "Páginas de acção e autor" },
];

const SIZES: { id: ImageSize; label: string; pct: string; icon: typeof Square }[] = [
  { id: "small", label: "Pequeno", pct: "30%", icon: Minimize2 },
  { id: "medium", label: "Médio", pct: "50%", icon: Square },
  { id: "large", label: "Grande", pct: "75%", icon: RectangleHorizontal },
  { id: "full", label: "Full", pct: "100%", icon: Maximize },
];

const POSITIONS: { id: ImagePosition; label: string; icon: typeof AlignVerticalJustifyStart }[] = [
  { id: "top", label: "Topo", icon: AlignVerticalJustifyStart },
  { id: "center", label: "Centro", icon: AlignVerticalJustifyCenter },
  { id: "left", label: "Esquerda", icon: AlignHorizontalJustifyStart },
  { id: "right", label: "Direita", icon: AlignHorizontalJustifyEnd },
  { id: "bottom", label: "Fundo", icon: AlignVerticalJustifyEnd },
];

export const SIZE_TO_ASPECT: Record<ImageSize, string> = {
  small: "1:1, square format",
  medium: "4:3 format",
  large: "16:9 wide format",
  full: "panoramic, ultra-wide format",
};

interface Props {
  value: ImageLayoutConfig;
  onChange: (config: ImageLayoutConfig) => void;
}

export function EbookImageLayoutConfig({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const update = (key: keyof ImageLayoutConfig, partial: Partial<PageTypeImageConfig>) => {
    onChange({ ...value, [key]: { ...value[key], ...partial } });
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Configuração de imagens por tipo de página</Label>
      <p className="text-xs text-muted-foreground">Defina quantidade, tamanho e posição das imagens</p>

      <div className="space-y-1.5">
        {PAGE_TYPES.map(({ key, label, desc }) => {
          const cfg = value[key];
          const isOpen = expanded === key;

          return (
            <div key={key} className="rounded-xl border border-border/60 overflow-hidden transition-all">
              {/* Header */}
              <button
                onClick={() => setExpanded(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {cfg.count === 0 ? "Sem imagem" : `${cfg.count} × ${SIZES.find(s => s.id === cfg.size)?.pct}`}
                  </span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40">
                  {/* Count */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Quantidade</p>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((n) => (
                        <button
                          key={n}
                          onClick={() => update(key, { count: n })}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-medium transition-all border",
                            cfg.count === n
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30"
                          )}
                        >
                          {n === 0 ? "Nenhuma" : n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {cfg.count > 0 && (
                    <>
                      {/* Size */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium">Tamanho</p>
                        <div className="flex gap-1.5">
                          {SIZES.map((s) => {
                            const Icon = s.icon;
                            return (
                              <button
                                key={s.id}
                                onClick={() => update(key, { size: s.id })}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                  cfg.size === s.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30"
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {s.pct}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Position */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium">Posição</p>
                        <div className="flex gap-1.5">
                          {POSITIONS.map((p) => {
                            const Icon = p.icon;
                            return (
                              <button
                                key={p.id}
                                onClick={() => update(key, { position: p.id })}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                  cfg.position === p.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30"
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
