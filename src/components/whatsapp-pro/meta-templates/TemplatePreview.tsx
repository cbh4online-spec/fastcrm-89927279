import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Video, ExternalLink, Phone, Reply, Copy, Smartphone, Monitor } from "lucide-react";
import type { MetaTemplateDraft } from "../../../../supabase/functions/_shared/metaTemplateRules";

/** Converte a formatação WhatsApp (*negrito*, _itálico_, ~riscado~) em elementos seguros (sem HTML). */
function renderWa(text: string) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
  return parts.map((p, i) => {
    if (/^\*[^*]+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    if (/^~[^~]+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>;
    return <span key={i}>{p}</span>;
  });
}

export function TemplatePreview({ draft, mediaPreviewUrl }: { draft: MetaTemplateDraft; mediaPreviewUrl?: string | null }) {
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile");
  const isAuth = draft.category === "AUTHENTICATION";
  const body = isAuth
    ? `*123456* é o seu código de verificação.${draft.addSecurityRecommendation ? " Por segurança, não o partilhe." : ""}`
    : draft.body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, i) => draft.examples[Number(i) - 1] || `{{${i}}}`);
  const footer = isAuth ? (draft.codeExpirationMinutes ? `Este código expira em ${draft.codeExpirationMinutes} minutos.` : "") : draft.footer;
  const ht = draft.headerType ?? "NONE";
  const buttons = isAuth ? [{ type: "COPY", text: draft.copyCodeText || "Copiar código" }] : (draft.buttons ?? []);
  const Icon = ht === "IMAGE" ? ImageIcon : ht === "VIDEO" ? Video : FileText;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Pré-visualização</span>
        <div className="flex gap-1" role="group" aria-label="Formato da pré-visualização">
          <Button type="button" size="icon" variant={mode === "mobile" ? "secondary" : "ghost"} aria-label="Telemóvel" aria-pressed={mode === "mobile"} onClick={() => setMode("mobile")}><Smartphone className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant={mode === "desktop" ? "secondary" : "ghost"} aria-label="Computador" aria-pressed={mode === "desktop"} onClick={() => setMode("desktop")}><Monitor className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className={`rounded-xl bg-muted p-4 mx-auto ${mode === "mobile" ? "max-w-[320px]" : "w-full"}`}>
        <div className={`rounded-lg bg-card shadow-sm overflow-hidden ${mode === "mobile" ? "max-w-[280px]" : "max-w-[480px]"}`}>
          {ht === "TEXT" && draft.header && <p className="px-3 pt-3 font-semibold text-sm">{draft.header}</p>}
          {ht !== "NONE" && ht !== "TEXT" && (
            mediaPreviewUrl && ht === "IMAGE"
              ? <img src={mediaPreviewUrl} alt="Cabeçalho" className="w-full max-h-40 object-cover" />
              : <div className="flex h-28 items-center justify-center bg-muted/60 text-muted-foreground"><Icon className="h-8 w-8" /></div>
          )}
          <p className="px-3 py-2 text-sm whitespace-pre-wrap break-words">{body ? renderWa(body) : <span className="text-muted-foreground">A sua mensagem aparece aqui.</span>}</p>
          {footer && <p className="px-3 pb-2 text-xs text-muted-foreground">{footer}</p>}
          <p className="px-3 pb-2 text-right text-[10px] text-muted-foreground">12:00</p>
          {buttons.length > 0 && (
            <div className="border-t divide-y">
              {buttons.map((b, i) => (
                <div key={i} className="flex items-center justify-center gap-1.5 py-2 text-sm text-primary">
                  {b.type === "URL" ? <ExternalLink className="h-3.5 w-3.5" /> : b.type === "PHONE_NUMBER" ? <Phone className="h-3.5 w-3.5" /> : b.type === "COPY" ? <Copy className="h-3.5 w-3.5" /> : <Reply className="h-3.5 w-3.5" />}
                  {b.text || "Botão"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Os exemplos servem só para aprovação e pré-visualização. Nada é enviado.</p>
    </div>
  );
}
