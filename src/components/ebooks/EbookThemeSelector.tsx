import { cn } from "@/lib/utils";

export const EBOOK_THEMES = [
  { id: "modern-dark", label: "Moderno Escuro", colors: ["#1a1a2e", "#16213e", "#0f3460", "#e94560"], font: "serif" },
  { id: "corporate-light", label: "Corporativo Claro", colors: ["#f8f9fa", "#e9ecef", "#2b4162", "#385f71"], font: "sans" },
  { id: "gradient-vivid", label: "Gradiente Colorido", colors: ["#667eea", "#764ba2", "#f093fb", "#f5576c"], font: "sans" },
  { id: "minimalist", label: "Minimalista", colors: ["#ffffff", "#f5f5f5", "#333333", "#888888"], font: "serif" },
  { id: "nature", label: "Natureza", colors: ["#1b4332", "#2d6a4f", "#52b788", "#d8f3dc"], font: "serif" },
  { id: "sunset", label: "Pôr do Sol", colors: ["#ff6b35", "#f7c59f", "#004e89", "#1a659e"], font: "sans" },
] as const;

export type EbookThemeId = typeof EBOOK_THEMES[number]["id"];

interface Props {
  value: string;
  onChange: (id: string) => void;
}

export function EbookThemeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {EBOOK_THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onChange(theme.id)}
          className={cn(
            "relative rounded-xl p-3 border-2 transition-all duration-200 text-left group hover:scale-[1.02]",
            value === theme.id
              ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/20"
              : "border-border/60 hover:border-primary/40"
          )}
        >
          {/* Color preview */}
          <div className="flex gap-1 mb-2">
            {theme.colors.map((color, i) => (
              <div
                key={i}
                className="h-8 flex-1 rounded-md first:rounded-l-lg last:rounded-r-lg"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-foreground">{theme.label}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{theme.font}</p>
          {value === theme.id && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
