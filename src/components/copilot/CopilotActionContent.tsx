import { Link } from "react-router-dom";
import { MessageCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const RE = /\[\[acao\|([^|\]]*)\|([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]/g;

function waNumber(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "351" + d;
  return d.length >= 11 ? d : "";
}

export function CopilotActionContent({ content }: { content: string }) {
  const parts: Array<string | { id: string; name: string; phone: string; text: string }> = [];
  let last = 0;
  for (const m of content.matchAll(RE)) {
    parts.push(content.slice(last, m.index));
    parts.push({ id: m[1].trim(), name: m[2].trim(), phone: m[3].trim(), text: m[4].trim() });
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(content.slice(last));

  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (typeof p === "string") return <span key={i}>{p.replace(/\n{3,}/g, "\n\n")}</span>;
        const wa = waNumber(p.phone);
        const copy = async (openingWhatsApp = false) => {
          try {
            if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
            await navigator.clipboard.writeText(p.text);
            navigator.vibrate?.(20);
            toast.success(openingWhatsApp ? "Mensagem copiada! A abrir o WhatsApp…" : "Mensagem copiada");
          } catch {
            toast.error(openingWhatsApp
              ? "Não foi possível copiar. Se o WhatsApp abrir sem texto, volte e copie a mensagem manualmente."
              : "Não foi possível copiar. Selecione a mensagem e copie manualmente.");
          }
        };
        return (
          <span key={i} className="my-2 block rounded-lg border border-border bg-card p-2 whitespace-normal">
            <span className="block text-xs font-semibold text-foreground">{p.name}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{p.text}</span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              {wa ? (
                <Button asChild size="sm" className="h-8 gap-1 px-2.5 text-xs">
                  <a href={`https://wa.me/${wa}?text=${encodeURIComponent(p.text)}`} target="_blank" rel="noopener noreferrer"
                    onClick={() => { void copy(true); }}>
                    <MessageCircle className="h-3.5 w-3.5" /> Enviar por WhatsApp
                  </a>
                </Button>
              ) : (
                <span className="inline-flex h-8 items-center text-xs text-muted-foreground">Sem telefone</span>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => { void copy(); }} aria-label="Copiar mensagem"
                className="h-8 gap-1 px-2.5 text-xs">
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
              {(() => {
                const m = p.id.match(/^(?:(lead|contact|contacto):)?([0-9a-f-]{36})$/i);
                if (!m) return null;
                const base = m[1] && m[1].toLowerCase() !== "lead" ? "contacts" : "leads";
                return (
                  <Link to={`/dashboard/${base}/${m[2]}`} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" /> Ficha
                  </Link>
                );
              })()}
            </span>
          </span>
        );
      })}
    </span>
  );
}
