import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  RectangleVertical,
  Layers,
  Pen,
} from "lucide-react";
import { useState } from "react";

export type ImageSize = "small" | "medium" | "large" | "full";
export type ImagePosition = "top" | "center" | "left" | "right" | "bottom";
export type AspectPreset = "16:9" | "3:4" | "1:1" | "21:9";

export interface PageTypeImageConfig {
  count: number;
  size: ImageSize;
  position: ImagePosition;
  aspectPreset?: AspectPreset;
  customPrompt?: string;
  asBackground?: boolean;
}

export interface ImageLayoutConfig {
  cover: PageTypeImageConfig;
  chapter: PageTypeImageConfig;
  content: PageTypeImageConfig;
  cta: PageTypeImageConfig;
}

export const DEFAULT_IMAGE_LAYOUT: ImageLayoutConfig = {
  cover: { count: 1, size: "full", position: "center", aspectPreset: "16:9", asBackground: true },
  chapter: { count: 1, size: "large", position: "top", aspectPreset: "16:9" },
  content: { count: 1, size: "medium", position: "right", aspectPreset: "3:4" },
  cta: { count: 1, size: "small", position: "left", aspectPreset: "1:1" },
};

const PAGE_TYPES: { key: keyof ImageLayoutConfig; label: string; desc: string; allowBackground?: boolean; maxCount: number }[] = [
  { key: "cover", label: "Capa", desc: "Página de capa do eBook", allowBackground: true, maxCount: 1 },
  { key: "chapter", label: "Capítulo", desc: "Páginas de introdução de capítulo", maxCount: 2 },
  { key: "content", label: "Conteúdo", desc: "Páginas de texto / conteúdo", maxCount: 3 },
  { key: "cta", label: "CTA / Autor", desc: "Páginas de acção e autor", allowBackground: true, maxCount: 2 },
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

const ASPECT_PRESETS: { id: AspectPreset; label: string; icon: typeof Square; desc: string }[] = [
  { id: "16:9", label: "Paisagem", icon: RectangleHorizontal, desc: "16:9" },
  { id: "3:4", label: "Retrato", icon: RectangleVertical, desc: "3:4" },
  { id: "1:1", label: "Quadrado", icon: Square, desc: "1:1" },
  { id: "21:9", label: "Banner", icon: Maximize, desc: "21:9" },
];

export const SIZE_TO_ASPECT: Record<ImageSize, string> = {
  small: "1:1, square format",
  medium: "4:3 format",
  large: "16:9 wide format",
  full: "panoramic, ultra-wide format",
};

export const ASPECT_TO_PROMPT: Record<AspectPreset, string> = {
  "16:9": "wide landscape 16:9 format",
  "3:4": "portrait 3:4 format",
  "1:1": "square 1:1 format",
  "21:9": "ultra-wide cinematic 21:9 banner format",
};

/** Mini layout preview component */
function LayoutPreview({ cfg }: { cfg: PageTypeImageConfig }) {
  if (cfg.count === 0) {
    return (
      <div className="w-14 h-20 rounded border border-border/60 bg-muted/20 flex items-center justify-center">
        <span className="text-[8px] text-muted-foreground">Sem img</span>
      </div>
    );
  }

  const imgBlock = (
    <div className={cn(
      "rounded-sm",
      cfg.asBackground ? "bg-primary/20 border border-primary/30" : "bg-accent/30 border border-accent/40",
      cfg.size === "small" && "w-4 h-3",
      cfg.size === "medium" && "w-6 h-4",
      cfg.size === "large" && "w-8 h-5",
      cfg.size === "full" && "w-full h-6",
    )} />
  );

  const textBlock = <div className="space-y-0.5">{[...Array(3)].map((_, i) => <div key={i} className="h-[2px] bg-muted-foreground/20 rounded-full" style={{ width: `${80 - i * 15}%` }} />)}</div>;

  return (
    <div className={cn(
      "w-14 h-20 rounded border border-border/60 bg-background p-1 flex gap-0.5 overflow-hidden",
      (cfg.position === "left" || cfg.position === "right") ? "flex-row" : "flex-col",
      cfg.position === "right" && "flex-row-reverse",
      cfg.position === "bottom" && "flex-col-reverse",
      cfg.position === "center" && "flex-col items-center justify-center",
      cfg.asBackground && "relative",
    )}>
      {cfg.asBackground ? (
        <>
          <div className="absolute inset-0 bg-primary/10 rounded" />
          <div className="relative z-10 flex-1 flex flex-col justify-center p-0.5">{textBlock}</div>
        </>
      ) : (
        <>
          <div className="flex-shrink-0 flex items-center justify-center">{imgBlock}</div>
          <div className="flex-1 flex flex-col justify-center min-w-0">{textBlock}</div>
        </>
      )}
    </div>
  );
}

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
      <p className="text-xs text-muted-foreground">Defina quantidade, tamanho, aspecto e posição das imagens para cada tipo</p>

      <div className="space-y-1.5">
        {PAGE_TYPES.map(({ key, label, desc, allowBackground, maxCount }) => {
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
                  <LayoutPreview cfg={cfg} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {cfg.count === 0 ? "Sem imagem" : `${cfg.count} × ${cfg.aspectPreset || SIZES.find(s => s.id === cfg.size)?.pct}`}
                  </span>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/40">
                  {/* Count */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Quantidade por página</p>
                    <div className="flex gap-1.5">
                      {Array.from({ length: maxCount + 1 }, (_, n) => n).map((n) => (
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
                      {/* Aspect Preset */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium">Proporção</p>
                        <div className="flex gap-1.5">
                          {ASPECT_PRESETS.map((a) => {
                            const Icon = a.icon;
                            return (
                              <button
                                key={a.id}
                                onClick={() => update(key, { aspectPreset: a.id })}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                  cfg.aspectPreset === a.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30"
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {a.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Size */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground font-medium">Tamanho na página</p>
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

                      {/* Background toggle */}
                      {allowBackground && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground font-medium">Modo de apresentação</p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => update(key, { asBackground: false })}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                !cfg.asBackground
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30"
                              )}
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              Inline
                            </button>
                            <button
                              onClick={() => update(key, { asBackground: true })}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                cfg.asBackground
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/30"
                              )}
                            >
                              <Layers className="h-3.5 w-3.5" />
                              Fundo
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Custom prompt */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Pen className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground font-medium">Prompt personalizado (opcional)</p>
                        </div>
                        <Input
                          value={cfg.customPrompt || ""}
                          onChange={(e) => update(key, { customPrompt: e.target.value })}
                          placeholder={`Ex: "usar tons azuis", "estilo minimalista"...`}
                          className="h-8 text-xs"
                        />
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
