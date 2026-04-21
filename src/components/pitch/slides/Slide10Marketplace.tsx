import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { ShoppingBag, Store, BookOpen } from 'lucide-react';

const ICONS = [ShoppingBag, Store, BookOpen];
const TAGS = ['B2C', 'C2C · B2B', 'Lead Gen'];

export function Slide10Marketplace({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const c = resolveSlideContent('marketplace', tokens.slideOverrides);
  const items = c.items || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={c.subtitle} />
        <div className="grid grid-cols-3 gap-6 mt-8">
          {items.map((it, i) => {
            const Icon = ICONS[i] || ShoppingBag;
            return (
              <div key={i} className="rounded-2xl p-10 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-[#22D3EE] flex items-center justify-center">
                    <Icon className="w-9 h-9 text-[#0F172A]" />
                  </div>
                  <div className="text-[#22D3EE] font-semibold uppercase tracking-wide" style={{ fontSize: 16 }}>{TAGS[i] || ''}</div>
                </div>
                <div className="font-black mt-4" style={{ fontSize: 32 }}>{it.title}</div>
                <div className="text-white/70 mt-4" style={{ fontSize: 20 }}>{it.text}</div>
              </div>
            );
          })}
        </div>
        {c.extraText && (
          <div className="mt-10 rounded-2xl p-8 bg-[#CFFAFE] border-l-8 border-[#22D3EE]">
            <div className="font-bold text-[#0F172A]" style={{ fontSize: 26 }}>{c.extraText}</div>
          </div>
        )}
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Loja & Marketplace" />
    </SlideShell>
  );
}
