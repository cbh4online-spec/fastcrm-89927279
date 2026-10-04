import { useMemo, useRef, useState } from 'react';
import { ImageOff, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/** Encontra imagens com caminho local (ex.: "banner.png") que não vão aparecer no email. */
export function findLocalImageSources(html: string): string[] {
  const found = new Set<string>();
  const re = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = m[1].trim();
    if (!src || /^(https?:|data:|cid:|\{\{)/i.test(src)) continue;
    found.add(src);
  }
  return [...found];
}

function replaceSrc(html: string, oldSrc: string, newUrl: string) {
  const esc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(src\\s*=\\s*["'])${esc}(["'])`, 'g'), `$1${newUrl}$2`);
}

interface Props {
  html: string;
  onChange: (html: string) => void;
}

export function MissingImagesHelper({ html, onChange }: Props) {
  const missing = useMemo(() => findLocalImageSources(html), [html]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasUnsubPlaceholder = /URL_CANCELAR_SUBSCRICAO/.test(html);

  if (missing.length === 0 && !hasUnsubPlaceholder) return null;

  if (missing.length === 0) {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 flex items-center justify-between gap-3 text-sm">
        <p className="text-foreground">O link de cancelamento ainda não está ligado.</p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onChange(html.replace(/URL_CANCELAR_SUBSCRICAO/g, '{{unsubscribe_url}}'));
            toast.success('Link de cancelamento ligado');
          }}
        >
          Corrigir
        </Button>
      </div>
    );
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let next = html;
    let done = 0;
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: máximo 5MB`);
          continue;
        }
        // Associa pelo nome do ficheiro; se só falta uma imagem, usa qualquer ficheiro.
        const target =
          missing.find((s) => s.split('/').pop()?.toLowerCase() === file.name.toLowerCase()) ??
          (missing.length === 1 ? missing[0] : undefined);
        if (!target) {
          toast.error(`${file.name} não corresponde a nenhuma imagem em falta`);
          continue;
        }
        const ext = file.name.split('.').pop() || 'png';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from('email-images').upload(path, file, {
          contentType: file.type,
        });
        if (error) throw error;
        const { data } = supabase.storage.from('email-images').getPublicUrl(path);
        next = replaceSrc(next, target, data.publicUrl).replace(
          /URL_CANCELAR_SUBSCRICAO/g,
          '{{unsubscribe_url}}',
        );
        done++;
      }
      if (done) {
        onChange(next);
        toast.success(`${done} imagem(ns) colocada(s) no email`);
      }
    } catch (e) {
      toast.error('Não foi possível carregar a imagem', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ImageOff className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">
            {missing.length === 1 ? 'Falta 1 imagem' : `Faltam ${missing.length} imagens`} neste email
          </p>
          <p className="text-muted-foreground">
            Carregue o ficheiro e nós colocamos a imagem no sítio certo:
          </p>
          <ul className="list-disc pl-5 text-muted-foreground">
            {missing.map((s) => (
              <li key={s} className="font-mono text-xs break-all">{s}</li>
            ))}
          </ul>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button type="button" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
        Carregar {missing.length === 1 ? 'imagem' : 'imagens'}
      </Button>
    </div>
  );
}
