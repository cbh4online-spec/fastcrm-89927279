import { useRef } from "react";
import { Check, Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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

  const link = prepared.mediaUrl;
  const textOnly = link ? prepared.text.split(link).join("").replace(/\n{3,}/g, "\n\n").trim() : prepared.text;
  const copyPart = async (value: string, label: string) => {
    const ok = await tryCopyText(value);
    if (ok) toast.success(`${label} copiado. Cole no Instagram e carregue Enter.`);
    else toast.error(DM_COPY_FAILED_MESSAGE);
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
      {link && (
        <p className="text-xs text-muted-foreground">
          Dica: no Instagram, envie primeiro o texto e depois o link na mesma conversa, para o vídeo não esconder a mensagem.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={copy}>
          {prepared.copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {prepared.copied ? "Copiada" : link ? "Copiar tudo" : "Copiar"}
        </Button>
        {link && (
          <>
            <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => copyPart(textOnly, "Texto")}>
              <Copy className="h-3 w-3" /> 1. Copiar texto
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => copyPart(link, "Link")}>
              <Copy className="h-3 w-3" /> 2. Copiar link
            </Button>
          </>
        )}
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
