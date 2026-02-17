import { type BioBlock } from "@/hooks/useBioBlocks";
import { Share2, ArrowRight, Play, MessageCircle, Calendar, HelpCircle, Star, ChevronRight } from "lucide-react";
import { getIconByName } from "@/lib/icons";

interface BioBlockPreviewCardProps {
  block: BioBlock;
  primaryColor: string;
  index: number;
}

// Parse hex color to HSL components
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const GRADIENT_VARIANTS = [
  (h: number, s: number, l: number) =>
    `linear-gradient(135deg, hsl(${h}, ${s}%, ${l}%) 0%, hsl(${h + 15}, ${Math.min(s + 10, 100)}%, ${Math.max(l - 15, 10)}%) 100%)`,
  (h: number, s: number, l: number) =>
    `linear-gradient(160deg, hsl(${h - 10}, ${s}%, ${Math.min(l + 10, 90)}%) 0%, hsl(${h + 20}, ${s}%, ${l}%) 100%)`,
  (h: number, s: number, l: number) =>
    `linear-gradient(45deg, hsl(${h}, ${Math.min(s + 15, 100)}%, ${l}%) 0%, hsl(${(h + 40) % 360}, ${s}%, ${Math.min(l + 5, 85)}%) 100%)`,
  (h: number, s: number, l: number) =>
    `linear-gradient(180deg, hsl(${h + 5}, ${s}%, ${Math.min(l + 15, 85)}%) 0%, hsl(${h - 5}, ${Math.min(s + 20, 100)}%, ${Math.max(l - 10, 15)}%) 100%)`,
  (h: number, s: number, l: number) =>
    `linear-gradient(120deg, hsl(${(h + 180) % 360}, ${Math.max(s - 10, 30)}%, ${l}%) 0%, hsl(${h}, ${s}%, ${Math.max(l - 5, 20)}%) 100%)`,
];

function getGradient(primaryColor: string, variantIndex: number): string {
  const { h, s, l } = hexToHSL(primaryColor || "#3b82f6");
  const fn = GRADIENT_VARIANTS[variantIndex % GRADIENT_VARIANTS.length];
  return fn(h, s, l);
}

function getContrastColor(primaryColor: string): string {
  const { l } = hexToHSL(primaryColor || "#3b82f6");
  return l > 55 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)";
}

function getSubtleColor(primaryColor: string): string {
  const { l } = hexToHSL(primaryColor || "#3b82f6");
  return l > 55 ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.7)";
}

export function BioBlockPreviewCard({ block, primaryColor, index }: BioBlockPreviewCardProps) {
  const content = block.content as Record<string, any>;
  const variantIndex = content.gradient_variant ?? index;
  const gradient = getGradient(primaryColor, variantIndex);
  const textColor = getContrastColor(primaryColor);
  const subtleColor = getSubtleColor(primaryColor);
  const bgImage = content.bg_image;

  const cardStyle: React.CSSProperties = {
    background: bgImage ? undefined : gradient,
    backgroundImage: bgImage ? `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${bgImage})` : undefined,
    backgroundSize: bgImage ? "cover" : undefined,
    backgroundPosition: bgImage ? "center" : undefined,
  };

  switch (block.block_type) {
    case "hero": {
      const HeroIcon = getIconByName(content.icon || "Sparkles");
      const { h, s, l } = hexToHSL(primaryColor || "#3b82f6");
      const iconGradient = `linear-gradient(135deg, hsl(${h}, ${Math.min(s + 10, 100)}%, ${Math.min(l + 10, 80)}%) 0%, hsl(${(h + 20) % 360}, ${s}%, ${Math.max(l - 10, 20)}%) 100%)`;
      return (
        <div className="rounded-3xl p-5 pt-2 shadow-lg text-center" style={cardStyle}>
          <div
            className="mx-auto -mt-4 mb-4 flex h-20 w-20 items-center justify-center rounded-full shadow-xl"
            style={{
              background: bgImage ? "rgba(255,255,255,0.2)" : iconGradient,
              boxShadow: `0 10px 30px -5px ${primaryColor}40, 0 0 0 4px ${bgImage ? "rgba(255,255,255,0.3)" : `${primaryColor}30`}`,
            }}
          >
            <HeroIcon className="h-10 w-10" style={{ color: "#fff" }} />
          </div>
          <h2 className="text-xl font-extrabold leading-tight mb-1.5" style={{ color: bgImage ? "#fff" : textColor }}>
            {content.title || "Título Principal"}
          </h2>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: bgImage ? "rgba(255,255,255,0.8)" : subtleColor }}>
            {content.subtitle || "Subtítulo descritivo aqui"}
          </p>
          {(content.cta_text || content.cta_url) && (
            <button
              className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold shadow-md transition-transform hover:scale-105"
              style={{ backgroundColor: bgImage ? "#fff" : textColor, color: bgImage ? "#000" : primaryColor }}
            >
              {content.cta_text || "Saiba Mais"}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }

    case "feature":
      return (
        <div className="rounded-3xl p-6 shadow-lg" style={cardStyle}>
          <h3 className="text-lg font-bold mb-1" style={{ color: bgImage ? "#fff" : textColor }}>
            {content.title || "Feature"}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: bgImage ? "rgba(255,255,255,0.8)" : subtleColor }}>
            {content.subtitle || "Descrição da feature"}
          </p>
          {content.cta_text && (
            <button
              className="mt-4 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold shadow-sm transition-transform hover:scale-105"
              style={{ backgroundColor: bgImage ? "#fff" : textColor, color: bgImage ? "#000" : primaryColor }}
            >
              {content.cta_text}
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      );

    case "link":
    case "button":
      return (
        <div
          className="rounded-2xl p-5 shadow-lg transition-transform hover:scale-[1.02]"
          style={block.block_type === "button" ? cardStyle : { border: `2px solid ${primaryColor}20`, background: `${primaryColor}08` }}
        >
          <div className="flex items-center justify-between">
            <span
              className="font-bold text-base"
              style={{ color: block.block_type === "button" ? textColor : primaryColor }}
            >
              {content.text || "Link"}
            </span>
            <ArrowRight
              className="h-4 w-4"
              style={{ color: block.block_type === "button" ? subtleColor : primaryColor }}
            />
          </div>
        </div>
      );

    case "text":
      return (
        <div className="rounded-2xl p-5">
          <p className="text-sm leading-relaxed text-foreground">{content.text || "Texto..."}</p>
        </div>
      );

    case "image":
      return content.url ? (
        <div className="rounded-3xl overflow-hidden shadow-lg">
          <img src={content.url} alt={content.alt || ""} className="w-full object-cover max-h-52" />
        </div>
      ) : (
        <div className="rounded-3xl h-32 flex items-center justify-center shadow-lg" style={cardStyle}>
          <span className="text-sm font-medium" style={{ color: textColor }}>📷 Imagem</span>
        </div>
      );

    case "video":
      return (
        <div className="rounded-3xl p-6 shadow-lg flex items-center gap-3" style={cardStyle}>
          <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: textColor }}>
            <Play className="h-5 w-5" style={{ color: primaryColor }} />
          </div>
          <span className="font-bold text-sm" style={{ color: textColor }}>
            {content.title || "Vídeo"}
          </span>
        </div>
      );

    case "social":
      return (
        <div className="rounded-2xl p-5 flex items-center justify-center gap-4" style={{ background: `${primaryColor}10` }}>
          <Share2 className="h-5 w-5" style={{ color: primaryColor }} />
          <span className="text-sm font-medium" style={{ color: primaryColor }}>Redes Sociais</span>
        </div>
      );

    case "whatsapp":
      return (
        <div className="rounded-2xl p-5 shadow-lg flex items-center gap-3" style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}>
          <MessageCircle className="h-5 w-5 text-white" />
          <span className="font-bold text-sm text-white">{content.text || "WhatsApp"}</span>
        </div>
      );

    case "calendar":
      return (
        <div className="rounded-2xl p-5 shadow-lg flex items-center gap-3" style={cardStyle}>
          <Calendar className="h-5 w-5" style={{ color: textColor }} />
          <span className="font-bold text-sm" style={{ color: textColor }}>{content.title || "Agendar"}</span>
        </div>
      );

    case "faq":
      return (
        <div className="rounded-2xl p-5 shadow-lg" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="h-4 w-4" style={{ color: textColor }} />
            <span className="font-bold text-sm" style={{ color: textColor }}>FAQ</span>
          </div>
          <p className="text-xs" style={{ color: subtleColor }}>Perguntas frequentes</p>
        </div>
      );

    case "testimonials":
      return (
        <div className="rounded-3xl p-6 shadow-lg" style={cardStyle}>
          <Star className="h-5 w-5 mb-2" style={{ color: textColor }} />
          <p className="text-sm italic leading-relaxed" style={{ color: textColor }}>
            "{content.text || "Depoimento incrível..."}"
          </p>
          <p className="text-xs mt-2 font-semibold" style={{ color: subtleColor }}>
            — {content.author || "Cliente"}
          </p>
        </div>
      );

    case "divider":
      return (
        <div className="py-2 px-4">
          <div className="h-px w-full rounded-full" style={{ background: `${primaryColor}30` }} />
        </div>
      );

    default:
      return (
        <div className="rounded-2xl p-4 shadow-lg" style={cardStyle}>
          <span className="text-xs font-medium" style={{ color: textColor }}>[{block.block_type}]</span>
        </div>
      );
  }
}
