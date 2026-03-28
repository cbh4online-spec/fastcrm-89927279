import { cn } from "@/lib/utils";
import { Paintbrush, Camera, Shapes, Box, Layers } from "lucide-react";

export const IMAGE_STYLES = [
  { id: "illustration", label: "Ilustração", icon: Paintbrush, desc: "Estilo editorial ilustrativo", prompt: "editorial illustration, clean lines, vibrant colors" },
  { id: "photography", label: "Fotografia", icon: Camera, desc: "Imagens fotorrealistas", prompt: "professional photography, high quality, realistic" },
  { id: "abstract", label: "Abstrato", icon: Shapes, desc: "Formas e texturas abstratas", prompt: "abstract art, geometric shapes, modern composition" },
  { id: "3d", label: "3D", icon: Box, desc: "Renders 3D modernos", prompt: "3D render, modern, clean, soft lighting, isometric" },
  { id: "flat", label: "Flat Design", icon: Layers, desc: "Design plano e limpo", prompt: "flat design, minimal, solid colors, vector style" },
] as const;

export type ImageStyleId = typeof IMAGE_STYLES[number]["id"];

const KEYWORD_TAGS = ["vibrante", "minimalista", "limpo", "geométrico", "orgânico", "elegante", "moderno", "clássico"];

interface Props {
  value: string;
  onChange: (id: string) => void;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
}

export function EbookImageStylePicker({ value, onChange, keywords, onKeywordsChange }: Props) {
  const toggleKeyword = (kw: string) => {
    onKeywordsChange(
      keywords.includes(kw) ? keywords.filter(k => k !== kw) : [...keywords, kw]
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {IMAGE_STYLES.map((style) => {
          const Icon = style.icon;
          return (
            <button
              key={style.id}
              onClick={() => onChange(style.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02]",
                value === style.id
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border/60 hover:border-primary/40"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                value === style.id ? "bg-primary/15" : "bg-muted"
              )}>
                <Icon className={cn("h-5 w-5", value === style.id ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className="text-xs font-medium text-foreground">{style.label}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{style.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Keyword tags */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Palavras-chave visuais (opcional)</p>
        <div className="flex flex-wrap gap-1.5">
          {KEYWORD_TAGS.map((kw) => (
            <button
              key={kw}
              onClick={() => toggleKeyword(kw)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                keywords.includes(kw)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {kw}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
