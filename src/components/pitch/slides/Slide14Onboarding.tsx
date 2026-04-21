import { PitchTokens, fillToken } from '@/lib/pitch/tokens';
import { resolveSlideContent, interpolate } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

export function Slide14Onboarding({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const presenter = fillToken(tokens.presenterName, 'a equipa de Customer Success');
  const c = resolveSlideContent('onboarding', tokens.slideOverrides);
  const subtitle = interpolate(c.subtitle, { presenter });
  const weeks = c.items || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={subtitle} />
        <div className="grid grid-cols-4 gap-6 mt-12">
          {weeks.map((w, i) => (
            <div key={i} className="relative">
              <div className="rounded-full w-16 h-16 flex items-center justify-center font-black text-white" style={{ background: '#0F172A', fontSize: 28 }}>{i + 1}</div>
              <div className="text-[#0E7490] font-semibold uppercase tracking-wide mt-6" style={{ fontSize: 18 }}>Semana {i + 1}</div>
              <div className="font-bold text-[#0F172A] mt-2" style={{ fontSize: 32 }}>{w.title}</div>
              <div className="text-[#475569] mt-3" style={{ fontSize: 22 }}>{w.text}</div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Onboarding" />
    </SlideShell>
  );
}
