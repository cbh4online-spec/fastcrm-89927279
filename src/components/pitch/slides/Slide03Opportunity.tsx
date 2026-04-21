import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

export function Slide03Opportunity({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const c = resolveSlideContent('opportunity', tokens.slideOverrides);
  const stats = c.stats || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={c.subtitle} />
        <div className="grid grid-cols-2 gap-8 mt-12">
          {stats.map((s, i) => (
            <div key={i} className="rounded-2xl p-12 border-l-8 border-[#22D3EE] bg-[#F8FAFC]">
              <div className="font-black text-[#0F172A]" style={{ fontSize: 96, lineHeight: 1 }}>{s.value}</div>
              <div className="font-semibold mt-4 text-[#0F172A]" style={{ fontSize: 26 }}>{s.label}</div>
              {s.sub && <div className="text-[#64748B] mt-2" style={{ fontSize: 20 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Oportunidade" />
    </SlideShell>
  );
}
