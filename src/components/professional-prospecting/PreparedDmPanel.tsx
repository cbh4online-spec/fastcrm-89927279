import { useRef } from "react";
import { Check, Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DM_COPY_FAILED_MESSAGE, DM_INVALID_URL_MESSAGE, safeDmUrl, tryCopyText, type PreparedDm } from "@/lib/prospecting/dmWindow";

interface Props {
  prepared: PreparedDm;
  onCopied: (ok: boolean) => void;
  onOpened: () => void;
}

/** Texto preparado + cópia manual + link real «Abrir conversa» (sem popups). */
export function PreparedDmPanel({ prepared, onCopied, onOpened }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const href = safeDmUrl(prepared.dmUrl);

  const copy = async () => {
    const ok = await tryCopyText(prepared.text);
    if (!ok) ref.current?.select();
    onCopied(ok);
  };

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-2" data-testid="prepared-dm">
      <Textarea
        ref={ref}
        readOnly
        value={prepared.text}
        aria-label="Mensagem preparada"
        className="min-h-[80px] text-xs"
        onFocus={(e) => e.currentTarget.select()}
      />
      {!prepared.copied && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
          <AlertTriangle className="h-3 w-3" /> {DM_COPY_FAILED_MESSAGE}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={copy}>
          {prepared.copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {prepared.copied ? "Copiada" : "Copiar"}
        </Button>
        {href ? (
          <Button asChild size="sm" className="gap-1 text-xs">
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => onOpened()}>
              <ExternalLink className="h-3 w-3" /> Abrir conversa
            </a>
          </Button>
        ) : (
          <p className="text-xs text-destructive" role="alert">{DM_INVALID_URL_MESSAGE}</p>
        )}
      </div>
    </div>
  );
}
