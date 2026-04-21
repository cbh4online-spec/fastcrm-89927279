import { ChangeEvent, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePitchConfig } from '@/hooks/usePitchConfig';
import { PITCH_SLIDES } from './slides';
import {
  DEFAULT_SLIDE_CONTENT,
  SLIDE_EDITOR_SCHEMAS,
  SlideContent,
  SlideEditorSchema,
  SlideItem,
  SlideStat,
  resolveSlideContent,
} from '@/lib/pitch/slideContent';

type PitchConfig = ReturnType<typeof usePitchConfig>;

interface Props {
  config?: PitchConfig;
  /** Currently selected slide index (kept in sync with editor preview). */
  currentIndex: number;
  onSelectSlide: (idx: number) => void;
}

export function PitchSlideEditor({ config, currentIndex, onSelectSlide }: Props) {
  const fallback = usePitchConfig();
  const c = config ?? fallback;
  const slideMeta = PITCH_SLIDES[currentIndex];
  const schema = useMemo<SlideEditorSchema | undefined>(
    () => SLIDE_EDITOR_SCHEMAS.find((s) => s.id === slideMeta.id),
    [slideMeta.id]
  );

  const effective = useMemo(
    () => resolveSlideContent(slideMeta.id, c.tokens.slideOverrides),
    [slideMeta.id, c.tokens.slideOverrides]
  );
  const defaults = DEFAULT_SLIDE_CONTENT[slideMeta.id] || {};

  const update = (patch: Partial<SlideContent>) => {
    c.updateSlideContent(slideMeta.id, patch);
  };

  const updateItem = (idx: number, patch: Partial<SlideItem>) => {
    const base = effective.items || defaults.items || [];
    const next = base.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    update({ items: next });
  };

  const updateStat = (idx: number, patch: Partial<SlideStat>) => {
    const base = effective.stats || defaults.stats || [];
    const next = base.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    update({ stats: next });
  };

  const updateBullet = (idx: number, value: string) => {
    const base = effective.bullets || defaults.bullets || [];
    const next = base.map((b, i) => (i === idx ? value : b));
    update({ bullets: next });
  };

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem demasiado grande (máx 2 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update({ imageUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  const isInvestmentSummary = slideMeta.id === 'investment-summary';

  if (!schema && !isInvestmentSummary) {
    return <div className="p-5 text-sm text-muted-foreground">Este slide não é editável.</div>;
  }

  const f = schema?.fields ?? {};

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-5">
        {/* Slide picker */}
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Slide</Label>
          <Select
            value={String(currentIndex)}
            onValueChange={(v) => onSelectSlide(Number(v))}
          >
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PITCH_SLIDES.map((s, i) => (
                <SelectItem key={s.id} value={String(i)}>
                  {i + 1}. {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Usa <code className="px-1 bg-muted rounded">{'{company}'}</code>, <code className="px-1 bg-muted rounded">{'{contact}'}</code>, <code className="px-1 bg-muted rounded">{'{presenter}'}</code> nos textos.
          </p>
        </div>

        {/* Reset slide */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            c.resetSlideContent(slideMeta.id);
            toast.success('Slide reposto.');
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" /> Repor slide para predefinição
        </Button>

        {/* Investment Summary — overrides dedicados */}
        {slideMeta.id === 'investment-summary' && (
          <InvestmentSummaryOverrides
            tier={c.tokens.tier || 'grow'}
            currentPrice={effective.price ?? ''}
            currentPriceNote={effective.priceNote ?? ''}
            onChangePrice={(price) => update({ price })}
            onChangePriceNote={(priceNote) => update({ priceNote })}
          />
        )}

        {/* Header fields */}
        {f.eyebrow && (
          <div>
            <Label htmlFor="f-eyebrow">Eyebrow</Label>
            <Input
              id="f-eyebrow"
              value={effective.eyebrow ?? ''}
              onChange={(e) => update({ eyebrow: e.target.value })}
              placeholder={defaults.eyebrow}
            />
          </div>
        )}

        {f.title && (
          <div>
            <Label htmlFor="f-title">Título</Label>
            <Textarea
              id="f-title"
              rows={2}
              value={effective.title ?? ''}
              onChange={(e) => update({ title: e.target.value })}
              placeholder={defaults.title}
            />
          </div>
        )}

        {f.subtitle && (
          <div>
            <Label htmlFor="f-subtitle">Subtítulo</Label>
            <Textarea
              id="f-subtitle"
              rows={3}
              value={effective.subtitle ?? ''}
              onChange={(e) => update({ subtitle: e.target.value })}
              placeholder={defaults.subtitle}
            />
          </div>
        )}

        {f.heroText && (
          <div>
            <Label htmlFor="f-hero">Texto principal</Label>
            <Textarea
              id="f-hero"
              rows={3}
              value={effective.heroText ?? ''}
              onChange={(e) => update({ heroText: e.target.value })}
              placeholder={defaults.heroText}
            />
          </div>
        )}

        {f.heroSubtitle && (
          <div>
            <Label htmlFor="f-hsub">Texto secundário</Label>
            <Textarea
              id="f-hsub"
              rows={3}
              value={effective.heroSubtitle ?? ''}
              onChange={(e) => update({ heroSubtitle: e.target.value })}
              placeholder={defaults.heroSubtitle}
            />
          </div>
        )}

        {/* Image upload */}
        {f.imageUrl && (
          <div>
            <Label>Imagem</Label>
            <div className="flex items-center gap-2 mt-1">
              {effective.imageUrl ? (
                <div className="relative">
                  <img src={effective.imageUrl} alt="slide" className="h-20 w-32 object-cover rounded border" />
                  <button onClick={() => update({ imageUrl: '' })} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <Label className="cursor-pointer flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted">
                  <Upload className="h-4 w-4" /> Carregar imagem
                  <Input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </Label>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        {f.items && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {f.items.titleLabel ? `${f.items.titleLabel}s` : 'Cartões'}
            </Label>
            <div className="space-y-3 mt-2">
              {Array.from({ length: f.items.count }).map((_, i) => {
                const item = effective.items?.[i] || { title: '', text: '' };
                const def = defaults.items?.[i];
                return (
                  <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
                    <div className="text-xs font-semibold text-muted-foreground">#{i + 1}</div>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                      placeholder={def?.title || (f.items?.titleLabel ?? 'Título')}
                    />
                    <Textarea
                      rows={2}
                      value={item.text}
                      onChange={(e) => updateItem(i, { text: e.target.value })}
                      placeholder={def?.text || (f.items?.textLabel ?? 'Descrição')}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bullets */}
        {f.bullets && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pontos</Label>
            <div className="space-y-2 mt-2">
              {Array.from({ length: f.bullets.count }).map((_, i) => (
                <Input
                  key={i}
                  value={effective.bullets?.[i] ?? ''}
                  onChange={(e) => updateBullet(i, e.target.value)}
                  placeholder={defaults.bullets?.[i]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {f.stats && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Estatísticas</Label>
            <div className="space-y-3 mt-2">
              {Array.from({ length: f.stats.count }).map((_, i) => {
                const s = effective.stats?.[i] || { value: '', label: '', sub: '' };
                const def = defaults.stats?.[i];
                return (
                  <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
                    <div className="text-xs font-semibold text-muted-foreground">#{i + 1}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        className="col-span-1"
                        value={s.value}
                        onChange={(e) => updateStat(i, { value: e.target.value })}
                        placeholder={def?.value || 'Valor'}
                      />
                      <Input
                        className="col-span-2"
                        value={s.label}
                        onChange={(e) => updateStat(i, { label: e.target.value })}
                        placeholder={def?.label || 'Etiqueta'}
                      />
                    </div>
                    <Input
                      value={s.sub ?? ''}
                      onChange={(e) => updateStat(i, { sub: e.target.value })}
                      placeholder={def?.sub || 'Detalhe (opcional)'}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Extra text */}
        {f.extraText && (
          <div>
            <Label htmlFor="f-extra">{f.extraText.label || 'Texto adicional'}</Label>
            <Textarea
              id="f-extra"
              rows={f.extraText.multiline ? 4 : 2}
              value={effective.extraText ?? ''}
              onChange={(e) => update({ extraText: e.target.value })}
              placeholder={defaults.extraText}
            />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/* ---------------- Investment Summary overrides ---------------- */

function InvestmentSummaryOverrides({
  tier,
  currentPrice,
  currentPriceNote,
  onChangePrice,
  onChangePriceNote,
}: {
  tier: import('@/lib/pitch/pricing').PitchTier;
  currentPrice: string;
  currentPriceNote: string;
  onChangePrice: (v: string) => void;
  onChangePriceNote: (v: string) => void;
}) {
  const defaultSetup = DEFAULT_PLAN_SETUP_EUR[tier] ?? 0;
  const parsedSetup = parsePriceBreakdown(currentPrice).setupEur;
  const setupValue = parsedSetup > 0 ? String(parsedSetup) : '';

  const usersMatch = currentPriceNote.match(/users?\s*[:=]\s*(\d+)/i);
  const usersValue = usersMatch ? usersMatch[1] : '';

  const setSetup = (raw: string) => {
    const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
    if (!isFinite(n) || n <= 0) {
      onChangePrice('');
    } else {
      onChangePrice(`€${n} setup`);
    }
  };

  const setUsers = (raw: string) => {
    const n = parseInt(raw.replace(/[^\d]/g, ''), 10);
    const stripped = currentPriceNote.replace(/users?\s*[:=]\s*\d+/i, '').trim();
    if (!isFinite(n) || n <= 0) {
      onChangePriceNote(stripped);
    } else {
      onChangePriceNote(stripped ? `${stripped} users:${n}` : `users:${n}`);
    }
  };

  return (
    <div className="rounded-md border border-dashed p-3 space-y-3 bg-muted/20">
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
          Resumo de investimento — overrides
        </Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Ajusta o setup do plano e o nº de utilizadores. Os totais (mensal, anual e setup único) atualizam automaticamente.
        </p>
      </div>

      <div>
        <Label htmlFor="f-setup-override" className="text-xs">
          Setup do plano (€) — override
        </Label>
        <Input
          id="f-setup-override"
          type="number"
          min={0}
          step={50}
          value={setupValue}
          onChange={(e) => setSetup(e.target.value)}
          placeholder={`Predefinido: €${defaultSetup}`}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Vazio usa o valor por defeito do tier ({`€${defaultSetup}`}).
        </p>
      </div>

      <div>
        <Label htmlFor="f-users-override" className="text-xs">
          Nº de utilizadores — override
        </Label>
        <Input
          id="f-users-override"
          type="number"
          min={1}
          step={1}
          value={usersValue}
          onChange={(e) => setUsers(e.target.value)}
          placeholder="Auto (do plano)"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Vazio usa o valor detetado do plano selecionado.
        </p>
      </div>
    </div>
  );
}
