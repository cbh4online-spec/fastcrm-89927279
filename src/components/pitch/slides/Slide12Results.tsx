import { PitchTokens, fillToken } from '@/lib/pitch/tokens';
import { resolveSlideContent, interpolate } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

export function Slide12Results({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const company = fillToken(tokens.companyName, 'a sua empresa');
  const c = resolveSlideContent('results', tokens.slideOverrides);
  const stats = c.stats || [];
  const title = interpolate(c.title, { company });
  const subtitle = interpolate(c.subtitle, { company });
  return (
    <SlideShell variant="dark">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader dark eyebrow={c.eyebrow} title={title} subtitle={subtitle} />
        <div className="grid grid-cols-4 gap-6 mt-12">
          {stats.map((k, i) => (
            <div key={i} className="rounded-2xl p-10 bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="font-black text-[#22D3EE]" style={{ fontSize: 88, lineHeight: 1 }}>{k.value}</div>
              <div className="font-semibold mt-4 text-white" style={{ fontSize: 26 }}>{k.label}</div>
              {k.sub && <div className="text-white/60 mt-2" style={{ fontSize: 18 }}>{k.sub}</div>}
            </div>
          ))}
        </div>
      </div>
      <SlideFooter dark pageNumber={pageNumber} total={total} label="Resultados" />
    </SlideShell>
  );
}
