import { DEFAULT_PRICING_PLANS, PitchTokens, fillToken } from '@/lib/pitch/tokens';
import { resolveSlideContent, interpolate } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { Check } from 'lucide-react';

export function Slide13Pricing({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const company = fillToken(tokens.companyName, 'a sua empresa');
  const plans = (tokens.pricingPlans && tokens.pricingPlans.length > 0) ? tokens.pricingPlans : DEFAULT_PRICING_PLANS;
  const c = resolveSlideContent('pricing', tokens.slideOverrides);
  const title = interpolate(c.title, { company });
  const subtitle = interpolate(c.subtitle, { company });
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={title} subtitle={subtitle} />
        <div className={`grid gap-6 mt-8 ${plans.length >= 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {plans.map((p) => (
            <div key={p.name} className={`rounded-2xl p-7 border-2 ${p.highlight ? 'border-[#22D3EE] bg-gradient-to-br from-[#CFFAFE] to-white shadow-xl scale-[1.02]' : 'border-[#E2E8F0] bg-white'}`}>
              {p.highlight && (
                <div className="inline-block px-3 py-1 rounded-full bg-[#22D3EE] text-[#0F172A] font-bold uppercase tracking-wide mb-3" style={{ fontSize: 13 }}>
                  Mais popular
                </div>
              )}
              <div className="font-bold text-[#0F172A]" style={{ fontSize: 28 }}>{p.name}</div>
              <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                <span className="font-black text-[#0F172A]" style={{ fontSize: 48 }}>{p.price}</span>
              </div>
              <div className="text-[#64748B] mt-1" style={{ fontSize: 15 }}>{p.sub}</div>
              <div className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#0E7490' }} />
                    <div className="text-[#0F172A]" style={{ fontSize: 16 }}>{f}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Investimento" />
    </SlideShell>
  );
}
