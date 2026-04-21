import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { AlertTriangle, Clock, Users2, TrendingDown } from 'lucide-react';

const ICONS = [Clock, Users2, TrendingDown, AlertTriangle];

export function Slide02Problem({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const c = resolveSlideContent('problem', tokens.slideOverrides);
  const items = c.items || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={c.subtitle} />
        <div className="grid grid-cols-2 gap-8 mt-8">
          {items.map((it, i) => {
            const Icon = ICONS[i] || AlertTriangle;
            return (
              <div key={i} className="border border-[#E2E8F0] rounded-2xl p-10 bg-white shadow-sm">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6" style={{ background: '#CFFAFE' }}>
                  <Icon className="w-9 h-9" style={{ color: '#0E7490' }} />
                </div>
                <div className="font-bold mb-3" style={{ fontSize: 32 }}>{it.title}</div>
                <div className="text-[#475569]" style={{ fontSize: 22 }}>{it.text}</div>
              </div>
            );
          })}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="O Problema" />
    </SlideShell>
  );
}
