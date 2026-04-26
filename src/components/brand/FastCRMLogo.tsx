import { cn } from "@/lib/utils";
import logoFull from "@/assets/fastcrm-logo.png";
import logoMark from "@/assets/fastcrm-mark.png";

/**
 * Presets oficiais de tamanho do FastCRMLogo (em px de altura).
 * Usar SEMPRE um preset em vez de altura arbitrária para garantir
 * consistência visual entre headers, rodapés, sidebars e botões.
 *
 *  xs  16  → favicons inline, chips, badges
 *  sm  20  → botões, sidebars compactas (collapsed), menus densos
 *  md  28  → sidebars expandidas, cards, footers secundários
 *  lg  36  → headers principais (mobile), auth, footer da landing
 *  xl  44  → headers desktop em hero, dialogs de marca
 *  2xl 64  → splash, empty states, vitrines
 */
export const LOGO_SIZE = {
  xs: 16,
  sm: 20,
  md: 28,
  lg: 36,
  xl: 44,
  "2xl": 64,
} as const;

export type FastCRMLogoSize = keyof typeof LOGO_SIZE;

interface FastCRMLogoProps {
  /** "full" para lockup completo, "mark" só para o símbolo */
  variant?: "full" | "mark";
  /** Preset de tamanho (preferido). Default: "md" */
  size?: FastCRMLogoSize;
  /** Override numérico em px. Usar apenas em casos excepcionais. */
  height?: number;
  className?: string;
  alt?: string;
}

/**
 * Logo oficial FastCRM. Use sempre o preset `size` em vez de `height`
 * arbitrário, exceto quando o contexto exige um tamanho fora da grelha.
 *
 * @example
 *   <FastCRMLogo size="lg" />            // header
 *   <FastCRMLogo variant="mark" size="sm" /> // botão / sidebar compacta
 */
export function FastCRMLogo({
  variant = "full",
  size = "md",
  height,
  className,
  alt = "FastCRM",
}: FastCRMLogoProps) {
  const src = variant === "full" ? logoFull : logoMark;
  const h = height ?? LOGO_SIZE[size];
  return (
    <img
      src={src}
      alt={alt}
      height={h}
      style={{ height: h, width: "auto" }}
      className={cn("select-none", className)}
      draggable={false}
      decoding="async"
      loading="eager"
    />
  );
}
