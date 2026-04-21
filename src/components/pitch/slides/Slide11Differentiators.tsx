import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { Check, X } from 'lucide-react';

// Static "them" answers — we keep this fixed; bullets describe "us" features.
const THEM = [false, false, false, true, false, false, false, false];

export function Slide11Differentiators({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const c = resolveSlideContent('diff', tokens.slideOverrides);
  const features = c.bullets || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} />
        <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden mt-8">
          <div className="grid grid-cols-12 bg-[#0F172A] text-white" style={{ fontSize: 22 }}>
            <div className="col-span-8 p-6 font-semibold">Funcionalidade</div>
            <div className="col-span-2 p-6 text-center font-bold text-[#22D3EE]">FastCRM</div>
            <div className="col-span-2 p-6 text-center font-semibold text-white/60">CRM genérico</div>
          </div>
          {features.map((f, i) => (
            <div key={i} className={`grid grid-cols-12 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`} style={{ fontSize: 22 }}>
              <div className="col-span-8 p-5 text-[#0F172A]">{f}</div>
              <div className="col-span-2 p-5 flex justify-center">
                <Check className="w-9 h-9" style={{ color: '#0E7490' }} />
              </div>
              <div className="col-span-2 p-5 flex justify-center">
                {THEM[i] ? <Check className="w-9 h-9" style={{ color: '#0E7490' }} /> : <X className="w-9 h-9 text-[#94A3B8]" />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Diferenciadores" />
    </SlideShell>
  );
}
