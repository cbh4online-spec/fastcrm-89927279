import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { COMPARABLE_MODULES } from '@/lib/pitch/moduleCatalog';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

/**
 * Generic reusable slide for optional "module deep-dive" slides.
 * Layout: Header + KPI strip (stats) + 2x2 grid of items.
 * Reads content from tokens.slideOverrides[slideId] / DEFAULT_SLIDE_CONTENT.
 */
export function SlideModuleFeature({
  slideId,
  label,
  tokens,
  pageNumber,
  total,
}: {
  slideId: string;
  label: string;
  tokens: PitchTokens;
  pageNumber: number;
  total: number;
}) {
  const c = resolveSlideContent(slideId, tokens.slideOverrides, {
    currency: tokens.currency,
    interval: tokens.billingInterval,
    tier: tokens.tier,
  });
  const items = c.items || [];
  const stats = c.stats || [];
  const tierKey = (tokens.tier ?? 'grow') as 'grow' | 'pro' | 'enterprise';
  const tierName = tierKey === 'pro' ? 'Pro' : tierKey === 'enterprise' ? 'Enterprise' : 'Grow';
  const catalogEntry = COMPARABLE_MODULES.find((m) => m.id === slideId);
  const tierLimit = catalogEntry?.limits[tierKey];

  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={c.subtitle} />

        {c.price && (
          <div
            className="absolute flex flex-col items-end"
            style={{ top: 96, right: 80 }}
          >
            <div className="rounded-2xl bg-[#0F172A] text-white px-5 py-3 shadow-lg flex flex-col items-end" style={{ minWidth: 220 }}>
              <div className="flex items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#22D3EE] font-bold">
                  Investimento
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#22D3EE] text-[#0F172A]">
                  {tierName}
                </div>
              </div>
              <div className="font-black leading-none mt-1" style={{ fontSize: 32 }}>
                {c.price}
              </div>
              {tierLimit && (
                <div className="mt-2 pt-2 border-t border-white/10 w-full text-right">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-[#94A3B8] font-semibold">
                    Limite incluído
                  </div>
                  <div className="text-[#E2E8F0] font-semibold mt-0.5" style={{ fontSize: 13 }}>
                    {tierLimit}
                  </div>
                </div>
              )}
            </div>
            {c.priceNote && (
              <div className="text-[#64748B] mt-1.5 text-right" style={{ fontSize: 12 }}>
                {c.priceNote}
              </div>
            )}
          </div>
        )}

        {stats.length > 0 && (
          <div
            className="grid gap-4 mb-8"
            style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}
          >
            {stats.slice(0, 4).map((s, i) => (
              <div key={i} className="rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] p-6 flex items-end gap-4">
                <div className="w-1 self-stretch rounded bg-[#22D3EE]" />
                <div>
                  <div className="font-black text-[#0F172A]" style={{ fontSize: 56 }}>{s.value}</div>
                  <div className="text-[#0F172A] font-semibold mt-1" style={{ fontSize: 18 }}>{s.label}</div>
                  {s.sub && <div className="text-[#64748B] mt-1" style={{ fontSize: 14 }}>{s.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-6">
            {items.slice(0, 4).map((it, i) => (
              <div key={i} className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="rounded-lg flex items-center justify-center font-bold text-[#0F172A]"
                    style={{ width: 44, height: 44, background: '#CFFAFE', fontSize: 22 }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="font-bold text-[#0F172A]" style={{ fontSize: 24 }}>{it.title}</div>
                </div>
                <div className="text-[#475569]" style={{ fontSize: 18 }}>{it.text}</div>
              </div>
            ))}
          </div>
        )}

        {c.extraText && (
          <div className="mt-8 rounded-xl bg-gradient-to-r from-[#CFFAFE] to-white border-l-4 border-[#22D3EE] p-5">
            <div className="text-[#0F172A] font-semibold" style={{ fontSize: 20 }}>{c.extraText}</div>
          </div>
        )}
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label={label} />
    </SlideShell>
  );
}

/** Factory to build a slide component bound to a specific slide id + label. */
export function makeModuleSlide(slideId: string, label: string) {
  return function ModuleSlide({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
    return <SlideModuleFeature slideId={slideId} label={label} tokens={tokens} pageNumber={pageNumber} total={total} />;
  };
}
