import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { Compass, Bot, TrendingUp, Zap } from 'lucide-react';

const LETTERS = ['P', 'A', 'R', 'E'];
const ICONS = [Compass, Bot, TrendingUp, Zap];

export function SlideMethodPare({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const c = resolveSlideContent('method-pare', tokens.slideOverrides);
  const items = c.items || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '80px 80px 100px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={c.subtitle} />

        <div className="grid grid-cols-4 gap-6 mt-10">
          {items.map((p, i) => {
            const Icon = ICONS[i] || Compass;
            return (
              <div key={i} className="rounded-2xl border-2 border-[#0F172A]/10 bg-white p-8 flex flex-col" style={{ minHeight: 500 }}>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-[#0F172A]" style={{ background: '#22D3EE', fontSize: 52 }}>
                    {LETTERS[i] || '·'}
                  </div>
                  <Icon className="w-10 h-10 text-[#0F172A]/40" />
                </div>
                <div className="font-bold text-[#0F172A]" style={{ fontSize: 32 }}>{p.title}</div>
                <p className="text-[#475569] mt-3 leading-snug" style={{ fontSize: 22 }}>{p.text}</p>
              </div>
            );
          })}
        </div>

        {c.extraText && (
          <div className="mt-10 rounded-2xl bg-[#0F172A] text-white p-8 flex items-center justify-between">
            <div>
              <div className="text-[#22D3EE] uppercase tracking-[0.2em] font-semibold" style={{ fontSize: 16 }}>Saber mais</div>
              <div className="font-bold mt-2" style={{ fontSize: 28 }}>metodopare.ai</div>
            </div>
            <div className="text-white/70 max-w-[900px] text-right" style={{ fontSize: 22 }}>{c.extraText}</div>
          </div>
        )}
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Método PARE" />
    </SlideShell>
  );
}
