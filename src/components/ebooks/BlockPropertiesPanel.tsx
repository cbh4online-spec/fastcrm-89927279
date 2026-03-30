import { useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Box, Palette, Type as TypeIcon, Square, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentBlock, BlockStyles } from '@/hooks/useEbooks';

interface BlockPropertiesPanelProps {
  block: ContentBlock;
  onUpdate: (block: ContentBlock) => void;
}

const ALIGN_OPTIONS = [
  { value: 'left' as const, icon: AlignLeft },
  { value: 'center' as const, icon: AlignCenter },
  { value: 'right' as const, icon: AlignRight },
  { value: 'justify' as const, icon: AlignJustify },
];

const SHADOW_OPTIONS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'soft', label: 'Suave' },
  { value: 'medium', label: 'Média' },
  { value: 'hard', label: 'Forte' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'];
const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi-Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra-Bold' },
];

function parsePx(val: string | undefined): number {
  if (!val) return 0;
  return parseInt(val.replace('px', ''), 10) || 0;
}

export function BlockPropertiesPanel({ block, onUpdate }: BlockPropertiesPanelProps) {
  const updateStyle = useCallback((key: keyof BlockStyles, value: string) => {
    onUpdate({ ...block, styles: { ...block.styles, [key]: value } });
  }, [block, onUpdate]);

  const s = block.styles;
  const isNonEditable = block.type === 'divider' || block.type === 'spacer';

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-5">
        {/* ─── Espaçamento ─── */}
        <Section icon={Box} label="Espaçamento">
          <div className="grid grid-cols-2 gap-2">
            <SpacingSlider label="Cima" value={s.paddingTop || s.padding} onChange={(v) => updateStyle('paddingTop', v)} />
            <SpacingSlider label="Baixo" value={s.paddingBottom || s.padding} onChange={(v) => updateStyle('paddingBottom', v)} />
            <SpacingSlider label="Esq." value={s.paddingLeft || s.padding} onChange={(v) => updateStyle('paddingLeft', v)} />
            <SpacingSlider label="Dir." value={s.paddingRight || s.padding} onChange={(v) => updateStyle('paddingRight', v)} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <SpacingSlider label="Margem ↑" value={s.marginTop || s.margin} onChange={(v) => updateStyle('marginTop', v)} />
            <SpacingSlider label="Margem ↓" value={s.marginBottom || s.margin} onChange={(v) => updateStyle('marginBottom', v)} />
          </div>
        </Section>

        {/* ─── Cores ─── */}
        <Section icon={Palette} label="Cores">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-16 shrink-0">Fundo</Label>
              <Input
                type="color"
                value={s.bgColor || '#ffffff'}
                onChange={(e) => updateStyle('bgColor', e.target.value)}
                className="h-7 w-10 p-0.5 cursor-pointer border-border"
              />
              <Input
                value={s.bgColor || ''}
                onChange={(e) => updateStyle('bgColor', e.target.value)}
                placeholder="transparent"
                className="h-7 text-xs flex-1"
              />
            </div>
            {!isNonEditable && (
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-16 shrink-0">Texto</Label>
                <Input
                  type="color"
                  value={s.textColor || '#000000'}
                  onChange={(e) => updateStyle('textColor', e.target.value)}
                  className="h-7 w-10 p-0.5 cursor-pointer border-border"
                />
                <Input
                  value={s.textColor || ''}
                  onChange={(e) => updateStyle('textColor', e.target.value)}
                  placeholder="inherit"
                  className="h-7 text-xs flex-1"
                />
              </div>
            )}
          </div>
        </Section>

        {/* ─── Tipografia ─── */}
        {!isNonEditable && (
          <Section icon={TypeIcon} label="Tipografia">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-16 shrink-0">Tamanho</Label>
                <Select value={s.fontSize || ''} onValueChange={(v) => updateStyle('fontSize', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Auto" /></SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(sz => <SelectItem key={sz} value={sz}>{sz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-16 shrink-0">Peso</Label>
                <Select value={s.fontWeight || ''} onValueChange={(v) => updateStyle('fontWeight', v)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Auto" /></SelectTrigger>
                  <SelectContent>
                    {FONT_WEIGHTS.map(fw => <SelectItem key={fw.value} value={fw.value}>{fw.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-16 shrink-0">Altura</Label>
                <Input
                  value={s.lineHeight || ''}
                  onChange={(e) => updateStyle('lineHeight', e.target.value)}
                  placeholder="1.6"
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Alinhamento</Label>
                <div className="flex gap-1">
                  {ALIGN_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateStyle('textAlign', opt.value)}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        s.textAlign === opt.value ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"
                      )}
                    >
                      <opt.icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ─── Bordas ─── */}
        <Section icon={Square} label="Bordas">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-16 shrink-0">Largura</Label>
              <Input
                value={s.borderWidth || ''}
                onChange={(e) => updateStyle('borderWidth', e.target.value)}
                placeholder="0px"
                className="h-7 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-16 shrink-0">Cor</Label>
              <Input
                type="color"
                value={s.borderColor || '#e5e7eb'}
                onChange={(e) => updateStyle('borderColor', e.target.value)}
                className="h-7 w-10 p-0.5 cursor-pointer border-border"
              />
              <Input
                value={s.borderColor || ''}
                onChange={(e) => updateStyle('borderColor', e.target.value)}
                placeholder="#e5e7eb"
                className="h-7 text-xs flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground w-16 shrink-0">Radius</Label>
              <Input
                value={s.borderRadius || ''}
                onChange={(e) => updateStyle('borderRadius', e.target.value)}
                placeholder="0px"
                className="h-7 text-xs"
              />
            </div>
          </div>
        </Section>

        {/* ─── Sombra ─── */}
        <Section icon={Layers} label="Sombra">
          <div className="flex gap-1">
            {SHADOW_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateStyle('shadow', opt.value)}
                className={cn(
                  "flex-1 text-xs py-1.5 rounded-md transition-colors text-center",
                  s.shadow === opt.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-muted-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </ScrollArea>
  );
}

function Section({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" /> {label}
      </span>
      {children}
    </div>
  );
}

function SpacingSlider({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const px = parsePx(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground font-mono">{px}px</span>
      </div>
      <Slider
        min={0}
        max={80}
        step={2}
        value={[px]}
        onValueChange={([v]) => onChange(`${v}px`)}
        className="w-full"
      />
    </div>
  );
}
