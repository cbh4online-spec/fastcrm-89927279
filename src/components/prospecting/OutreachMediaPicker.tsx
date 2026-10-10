import { useId, useRef, useState } from "react";
import { Link2, Film, Loader2, X, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  describeShareUrl,
  formatBytes,
  PROSPECTING_VIDEO_MIME,
  validateShareUrl,
  validateVideoFile,
  type OutreachMedia,
} from "@/lib/prospecting/outreachMedia";

interface Props {
  media: OutreachMedia | null;
  busy?: boolean;
  disabled?: boolean;
  title?: string;
  onSetUrl: (url: string) => Promise<unknown>;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}

/** Associa um link https ou um MP4 (≤16 MB) a uma etapa. Só pré-visualização textual. */
export function OutreachMediaPicker({ media, busy, disabled, title = "Vídeo ou link a partilhar", onSetUrl, onUpload, onRemove }: Props) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const showForm = !media || editing;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      setUrl("");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível guardar");
    }
  };

  const submitUrl = () => {
    const valid = validateShareUrl(url);
    if (!valid.ok) return setError(valid.error);
    void run(() => onSetUrl(valid.url));
  };

  const pickFile = (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const valid = validateVideoFile(file);
    if (!valid.ok) return setError(valid.error);
    void run(() => onUpload(file));
  };

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-xs font-medium">{title}</p>

      {media && !editing && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {media.kind === "video" ? <Film className="h-3.5 w-3.5" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
          <span className="font-medium">
            {media.kind === "video" ? `${media.label ?? "Vídeo MP4"} ${formatBytes(media.size_bytes)}` : describeShareUrl(media.url)}
          </span>
          <a href={media.url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline inline-flex items-center gap-1">
            {media.kind === "video" ? <><Download className="h-3 w-3" aria-hidden /> Abrir/descarregar</> : "Abrir ligação"}
          </a>
          <Button type="button" size="sm" variant="outline" className="h-7" disabled={disabled || busy} onClick={() => setEditing(true)}>
            Substituir
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7" disabled={disabled || busy} onClick={() => run(onRemove)} aria-label="Remover conteúdo">
            <X className="h-3.5 w-3.5" /> Remover
          </Button>
        </div>
      )}

      {showForm && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Label htmlFor={`${id}-url`} className="sr-only">Ligação https</Label>
            <Input
              id={`${id}-url`}
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              placeholder="https://www.instagram.com/reel/…"
              inputMode="url"
              maxLength={2048}
              disabled={disabled || busy}
              className="h-8 text-xs"
            />
            <Button type="button" size="sm" variant="outline" className="h-8" disabled={disabled || busy || !url.trim()} onClick={submitUrl}>
              Associar
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              id={`${id}-file`}
              type="file"
              accept={PROSPECTING_VIDEO_MIME}
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
              disabled={disabled || busy}
            />
            <Button type="button" size="sm" variant="outline" className="h-8" disabled={disabled || busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />} Carregar MP4 (até 16 MB)
            </Button>
            {editing && (
              <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => { setEditing(false); setError(null); }}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        A ligação é acrescentada uma vez à mensagem. Qualquer pessoa com a ligação pode ver o vídeo carregado (válida 90 dias).
        O FastCRM não anexa nem envia o vídeo pelo Instagram ou WhatsApp: abra/descarregue o MP4 e anexe-o manualmente, se quiser.
      </p>
    </div>
  );
}
