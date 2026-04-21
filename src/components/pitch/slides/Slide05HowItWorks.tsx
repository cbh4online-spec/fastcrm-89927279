import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

export function Slide05HowItWorks({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const c = resolveSlideContent('how', tokens.slideOverrides);
  const steps = c.items || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={c.subtitle} />
        <div className="grid grid-cols-4 gap-6 mt-12">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <div className="font-black text-[#22D3EE]" style={{ fontSize: 96, lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</div>
              <div className="font-bold mt-4 text-[#0F172A]" style={{ fontSize: 36 }}>{s.title}</div>
              <div className="text-[#475569] mt-3" style={{ fontSize: 22 }}>{s.text}</div>
              {i < steps.length - 1 && (
                <div className="absolute top-12 -right-3 w-6 h-1 bg-[#E2E8F0] rounded" />
              )}
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Como funciona" />
    </SlideShell>
  );
}
