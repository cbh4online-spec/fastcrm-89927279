import { cn } from "@/lib/utils";
import logoFull from "@/assets/fastcrm-logo.png";
import logoMark from "@/assets/fastcrm-mark.png";

interface FastCRMLogoProps {
  variant?: "full" | "mark";
  className?: string;
  /** Pixel height; width auto. Defaults: full=32, mark=32 */
  height?: number;
  alt?: string;
}

/**
 * Official FastCRM logo. Use `full` for headers and marketing,
 * `mark` for compact spaces (favicons, avatars, sidebars).
 */
export function FastCRMLogo({
  variant = "full",
  className,
  height,
  alt = "FastCRM",
}: FastCRMLogoProps) {
  const src = variant === "full" ? logoFull : logoMark;
  const h = height ?? 32;
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
