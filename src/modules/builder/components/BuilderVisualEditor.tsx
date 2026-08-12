import { useEffect, useMemo, useRef } from "react";
import { Monitor, Tablet, Smartphone, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sanitizeBuilderHtml } from "../lib/sanitizeBuilderHtml";
import { VISUAL_BRIDGE_SCRIPT } from "../lib/visualBridgeScript";
import type { BuilderPatch } from "../lib/builderHtmlPatch";
import { useState } from "react";

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTHS: Record<Device, number> = { desktop: 1280, tablet: 768, mobile: 375 };

export interface VisualSelection {
  bid: string;
  tag: string;
  attrs: Record<string, string>;
  computed: Record<string, string>;
  text: string | null;
}

export type SectionAction = "moveUp" | "moveDown" | "duplicate" | "delete" | "saveBlock";
export type DropPosition = "before" | "after" | "append";

interface Props {
  /** HTML já com bids atribuídos. */
  html: string;
  selectedBid: string | null;
  onSelect: (sel: VisualSelection | null) => void;
  onPatch: (patch: BuilderPatch) => void;
  /** Acções da barra flutuante da secção seleccionada. */
  onSectionAction?: (action: SectionAction, bid: string) => void;
  /** Largou-se um bloco no canvas, na posição indicada. */
  onDropBlock?: (targetBid: string | null, position: DropPosition) => void;
  /** Está a decorrer um arrasto vindo da biblioteca de blocos. */
  dragActive?: boolean;
  className?: string;
}

/**
 * Iframe interactivo que permite seleccionar elementos e editá-los inline.
 * O script-ponte é injectado dentro do iframe (sandbox allow-scripts + same-origin).
 */
export function BuilderVisualEditor({
  html,
  selectedBid,
  onSelect,
  onPatch,
  onSectionAction,
  onDropBlock,
  dragActive,
  className,
}: Props) {
  const [device, setDevice] = useState<Device>("desktop");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSelectedBid = useRef<string | null>(null);

  const safeHtml = useMemo(() => {
    const base = html?.trim()
      ? sanitizeBuilderHtml(html)
      : '<!doctype html><html><body style="font-family:system-ui;color:#666;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">Sem conteúdo</body></html>';
    const wrapped = /<html/i.test(base)
      ? base
      : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${base}</body></html>`;

    // injectar script de ponte antes de </body>
    const bridgeTag = `<script>${VISUAL_BRIDGE_SCRIPT}</script>`;
    if (/<\/body>/i.test(wrapped)) return wrapped.replace(/<\/body>/i, `${bridgeTag}</body>`);
    return wrapped + bridgeTag;
  }, [html]);

  // Recebe mensagens do iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data as { __builder?: boolean; kind?: string; [k: string]: unknown };
      if (!data || !data.__builder) return;
      if (data.kind === "ready") {
        // re-aplicar selecção se ainda válida
        if (lastSelectedBid.current) {
          iframeRef.current?.contentWindow?.postMessage(
            { __builderCmd: true, kind: "selectBid", bid: lastSelectedBid.current },
            "*",
          );
        }
      } else if (data.kind === "select") {
        lastSelectedBid.current = String(data.bid);
        onSelect({
          bid: String(data.bid),
          tag: String(data.tag),
          attrs: (data.attrs as Record<string, string>) || {},
          computed: (data.computed as Record<string, string>) || {},
          text: (data.text as string | null) ?? null,
        });
      } else if (data.kind === "patch") {
        onPatch(data.patch as BuilderPatch);
      } else if (data.kind === "action") {
        onSectionAction?.(data.action as SectionAction, String(data.bid));
      } else if (data.kind === "drop") {
        onDropBlock?.(
          (data.bid as string | null) ?? null,
          (data.position as DropPosition) ?? "append",
        );
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSelect, onPatch, onSectionAction, onDropBlock]);

  // Esconder o indicador de drop quando o arrasto termina fora do iframe
  useEffect(() => {
    if (dragActive) return;
    iframeRef.current?.contentWindow?.postMessage({ __builderCmd: true, kind: "dragEnd" }, "*");
  }, [dragActive]);

  // Sincronizar selecção externa para o iframe
  useEffect(() => {
    lastSelectedBid.current = selectedBid;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    if (selectedBid) {
      win.postMessage({ __builderCmd: true, kind: "selectBid", bid: selectedBid }, "*");
    } else {
      win.postMessage({ __builderCmd: true, kind: "clearSelection" }, "*");
    }
  }, [selectedBid]);

  const deviceWidth = DEVICE_WIDTHS[device];

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 rounded-lg border", className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background/60 backdrop-blur">
        <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <MousePointerClick className="h-3.5 w-3.5" />
          Canvas{" "}
          <span className="text-muted-foreground/60">
            — clica para seleccionar, duplo-clique para editar texto, arrasta blocos para inserir
          </span>
        </div>
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
                aria-label={`Editar em ${d}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 flex items-start justify-center">
        <div
          className={cn(
            "bg-background shadow-lg transition-all duration-300 ease-out border rounded-md overflow-hidden h-full min-h-[520px]",
            dragActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
          style={{ width: deviceWidth, maxWidth: "100%" }}
        >
          <iframe
            ref={iframeRef}
            title="Builder visual editor"
            sandbox="allow-same-origin allow-scripts"
            srcDoc={safeHtml}
            className="w-full h-full min-h-[520px] border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
    </div>
  );
}
