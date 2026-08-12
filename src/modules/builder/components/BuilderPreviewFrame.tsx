import { useMemo, useState } from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeBuilderHtml } from "../lib/sanitizeBuilderHtml";

type Device = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTHS: Record<Device, number> = {
  desktop: 1280,
  tablet: 768,
  mobile: 375,
};

interface Props {
  html: string;
  className?: string;
  defaultDevice?: Device;
}

/**
 * Iframe sandboxed que renderiza HTML sanitizado do Builder.
 * Bloqueia scripts e top-navigation por defeito.
 */
export function BuilderPreviewFrame({ html, className, defaultDevice = "desktop" }: Props) {
  const [device, setDevice] = useState<Device>(defaultDevice);

  const safeHtml = useMemo(() => {
    if (!html?.trim()) {
      return "<!doctype html><html><body style=\"font-family:system-ui;color:#666;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;\">Sem conteúdo</body></html>";
    }
    const cleaned = sanitizeBuilderHtml(html);
    // Se vier só fragmento, embrulhar em documento mínimo
    if (!/<html/i.test(cleaned)) {
      return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${cleaned}</body></html>`;
    }
    return cleaned;
  }, [html]);

  const deviceWidth = DEVICE_WIDTHS[device];

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 rounded-lg border", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background/60 backdrop-blur">
        <div className="text-xs font-medium text-muted-foreground">Pré-visualização</div>
        <div className="flex items-center gap-1">
          {(["desktop", "tablet", "mobile"] as Device[]).map((d) => {
            const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
            return (
              <Button
                key={d}
                variant={device === d ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDevice(d)}
                aria-label={`Pré-visualizar em ${d}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 flex items-stretch justify-center">
        <div
          className="bg-background shadow-lg transition-all duration-300 ease-out border rounded-md overflow-hidden flex-shrink-0"
          style={{ width: deviceWidth, maxWidth: "100%" }}
        >
          <iframe
            title="Builder preview"
            sandbox="allow-same-origin"
            srcDoc={safeHtml}
            className="w-full h-full min-h-[600px] border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
