import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { readSeo, writeSeo, SEO_LIMITS, type BuilderSeoMeta } from "../lib/builderSeo";

interface Props {
  html: string;
  onApply: (nextHtml: string) => void;
}

export function BuilderSeoPanel({ html, onApply }: Props) {
  const current = useMemo(() => readSeo(html), [html]);
  const [draft, setDraft] = useState<BuilderSeoMeta>(current);

  // Sincroniza quando o HTML muda por fora (undo, IA, código)
  useEffect(() => {
    setDraft(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.title, current.description, current.ogImage, current.lang, current.favicon, current.canonical]);

  const dirty = useMemo(
    () => (Object.keys(draft) as (keyof BuilderSeoMeta)[]).some((k) => draft[k] !== current[k]),
    [draft, current],
  );

  const set = (key: keyof BuilderSeoMeta, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const apply = () => onApply(writeSeo(html, draft));

  return (
    <div className="h-full flex flex-col bg-background border-l">
      <div className="p-3 border-b shrink-0">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5" /> SEO &amp; metadados
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Escrito no &lt;head&gt; da página publicada.
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          <Field
            id="seo-title"
            label="Título da página"
            hint={`${draft.title.length}/${SEO_LIMITS.title}`}
            over={draft.title.length > SEO_LIMITS.title}
          >
            <Input
              id="seo-title"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex.: Método PARE — Sistema de Aquisição"
              className="h-8 text-xs"
              maxLength={120}
            />
          </Field>

          <Field
            id="seo-description"
            label="Descrição"
            hint={`${draft.description.length}/${SEO_LIMITS.description}`}
            over={draft.description.length > SEO_LIMITS.description}
          >
            <Textarea
              id="seo-description"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Resumo em uma ou duas frases…"
              className="text-xs min-h-[72px]"
              maxLength={320}
            />
          </Field>

          <Field id="seo-og" label="Imagem de partilha (OG)" hint="1200×630">
            <Input
              id="seo-og"
              value={draft.ogImage}
              onChange={(e) => set("ogImage", e.target.value)}
              placeholder="https://…/preview.jpg"
              className="h-8 text-xs"
            />
          </Field>

          {draft.ogImage ? (
            <img
              src={draft.ogImage}
              alt="Pré-visualização da imagem de partilha"
              className="w-full aspect-[1200/630] object-cover rounded-md border"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}

          <Field id="seo-favicon" label="Favicon">
            <Input
              id="seo-favicon"
              value={draft.favicon}
              onChange={(e) => set("favicon", e.target.value)}
              placeholder="https://…/favicon.ico"
              className="h-8 text-xs"
            />
          </Field>

          <Field id="seo-canonical" label="URL canónico">
            <Input
              id="seo-canonical"
              value={draft.canonical}
              onChange={(e) => set("canonical", e.target.value)}
              placeholder="https://exemplo.pt/pagina"
              className="h-8 text-xs"
            />
          </Field>

          <Field id="seo-lang" label="Idioma">
            <Input
              id="seo-lang"
              value={draft.lang}
              onChange={(e) => set("lang", e.target.value)}
              placeholder="pt-PT"
              className="h-8 text-xs"
              maxLength={10}
            />
          </Field>

          <div className="rounded-md border p-2.5 bg-muted/40">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Pré-visualização Google
            </p>
            <p className="text-[13px] text-primary line-clamp-1">
              {draft.title || "Título da página"}
            </p>
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {draft.description || "A descrição aparece aqui nos resultados de pesquisa."}
            </p>
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t shrink-0">
        <Button size="sm" className="w-full" onClick={apply} disabled={!dirty}>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {dirty ? "Aplicar ao HTML" : "Sem alterações"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  over,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  over?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        {hint && (
          <span className={cn("text-[10px]", over ? "text-destructive" : "text-muted-foreground")}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
