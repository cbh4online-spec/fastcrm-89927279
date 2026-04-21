import { PitchTokens, fillToken } from '@/lib/pitch/tokens';
import { resolveSlideContent, interpolate, DEFAULT_MODULE_PRICES } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import {
  CURRENCIES,
  TIERS,
  formatPrice,
  intervalLabel,
  type PitchCurrency,
  type PitchTier,
} from '@/lib/pitch/pricing';
import { PITCH_SLIDES, DEFAULT_ENABLED_SLIDE_IDS } from './index';

/** Extract a numeric € value from a price string (e.g. "€29 /mês" → 29). */
function parseEur(price: string | undefined): number {
  if (!price) return 0;
  const m = price.match(/€\s*(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : 0;
}

interface LineItem {
  id: string;
  title: string;
  category: 'module' | 'vertical' | 'pack';
  monthlyEurBase: number;
  hasPrice: boolean;
}

export function Slide16InvestmentSummary({
  tokens,
  pageNumber,
  total,
}: {
  tokens: PitchTokens;
  pageNumber: number;
  total: number;
}) {
  const company = fillToken(tokens.companyName, 'a sua empresa');
  const c = resolveSlideContent('investment-summary', tokens.slideOverrides);
  const title = interpolate(c.title || 'Resumo do investimento — {company}', { company });
  const subtitle = interpolate(
    c.subtitle || 'Soma automática dos módulos ativos no plano selecionado.',
    { company }
  );
  const eyebrow = c.eyebrow || 'Investimento total';

  const enabled = tokens.enabledSlides ?? DEFAULT_ENABLED_SLIDE_IDS;
  const currency: PitchCurrency = tokens.currency || 'EUR';
  const tier: PitchTier = tokens.tier || 'grow';
  const tierMult = TIERS[tier].multiplier;
  const fxRate = CURRENCIES[currency].rate;

  const overrides = tokens.slideOverrides || {};

  const items: LineItem[] = PITCH_SLIDES
    .filter((s) => s.category !== 'core' && enabled.includes(s.id))
    .map((s) => {
      const ov = overrides[s.id];
      const effective = ov?.price ?? DEFAULT_MODULE_PRICES[s.id]?.price;
      const base = parseEur(effective);
      return {
        id: s.id,
        title: s.title,
        category: s.category as LineItem['category'],
        monthlyEurBase: base,
        hasPrice: base > 0,
      };
    });

  const subtotalMonthlyEur = items.reduce((acc, it) => acc + it.monthlyEurBase, 0);
  const monthlyConverted = subtotalMonthlyEur * tierMult * fxRate;
  // Annual = 10x monthly (2 months free, consistent with pricing.ts)
  const annualConverted = monthlyConverted * 10;

  const modulesWithoutPrice = items.filter((it) => !it.hasPrice);
  const activeOptionalCount = items.length;

  // Sort by descending price for visual hierarchy.
  const sorted = [...items].sort((a, b) => b.monthlyEurBase - a.monthlyEurBase);
  const visible = sorted.slice(0, 12);
  const hiddenCount = sorted.length - visible.length;

  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

        {activeOptionalCount === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-12 text-center">
            <div className="text-[#475569]" style={{ fontSize: 22 }}>
              Sem módulos opcionais selecionados.
            </div>
            <div className="text-[#94A3B8] mt-2" style={{ fontSize: 16 }}>
              Ativa módulos no painel "Módulos do pitch" para ver o resumo.
            </div>
          </div>
        ) : (
          <div className="grid mt-4" style={{ gridTemplateColumns: '1fr 420px', gap: 32 }}>
            {/* Coluna esquerda — lista de módulos */}
            <div className="rounded-2xl border-2 border-[#E2E8F0] bg-white overflow-hidden">
              <div
                className="px-6 py-3 border-b-2 border-[#E2E8F0] bg-[#F8FAFC] grid"
                style={{ gridTemplateColumns: '1fr auto', fontSize: 14 }}
              >
                <div className="font-semibold uppercase tracking-wider text-[#64748B]">
                  Módulo
                </div>
                <div className="font-semibold uppercase tracking-wider text-[#64748B] text-right">
                  Mensal · {TIERS[tier].label}
                </div>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {visible.map((it) => {
                  const monthlyConv = it.monthlyEurBase * tierMult * fxRate;
                  return (
                    <div
                      key={it.id}
                      className="px-6 py-3 grid items-center"
                      style={{ gridTemplateColumns: '1fr auto', fontSize: 17 }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider flex-shrink-0"
                          style={{
                            fontSize: 10,
                            background:
                              it.category === 'module'
                                ? '#E0F2FE'
                                : it.category === 'vertical'
                                ? '#FEF3C7'
                                : '#F3E8FF',
                            color:
                              it.category === 'module'
                                ? '#0369A1'
                                : it.category === 'vertical'
                                ? '#92400E'
                                : '#6B21A8',
                          }}
                        >
                          {it.category === 'module' ? 'Módulo' : it.category === 'vertical' ? 'Vertical' : 'Pack'}
                        </span>
                        <span className="truncate text-[#0F172A] font-medium">{it.title}</span>
                      </div>
                      <div className="font-mono tabular-nums font-semibold text-[#0F172A] pl-4">
                        {it.hasPrice ? formatPrice(monthlyConv, currency) : '—'}
                      </div>
                    </div>
                  );
                })}
                {hiddenCount > 0 && (
                  <div className="px-6 py-2 text-[#64748B] text-center" style={{ fontSize: 13 }}>
                    + {hiddenCount} módulo{hiddenCount === 1 ? '' : 's'} adicional{hiddenCount === 1 ? '' : 'is'}…
                  </div>
                )}
              </div>
            </div>

            {/* Coluna direita — totais */}
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-7">
                <div
                  className="uppercase tracking-[0.2em] text-[#22D3EE] font-semibold mb-2"
                  style={{ fontSize: 12 }}
                >
                  Total mensal
                </div>
                <div className="font-black leading-none" style={{ fontSize: 56 }}>
                  {formatPrice(monthlyConverted, currency)}
                </div>
                <div className="text-white/60 mt-2" style={{ fontSize: 14 }}>
                  {activeOptionalCount} módulo{activeOptionalCount === 1 ? '' : 's'} · plano {TIERS[tier].label} · {CURRENCIES[currency].code}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-[#22D3EE] bg-gradient-to-br from-[#CFFAFE] to-white p-7">
                <div
                  className="uppercase tracking-[0.2em] text-[#0E7490] font-semibold mb-2"
                  style={{ fontSize: 12 }}
                >
                  Total anual
                </div>
                <div className="font-black text-[#0F172A] leading-none" style={{ fontSize: 56 }}>
                  {formatPrice(annualConverted, currency)}
                </div>
                <div className="text-[#0E7490] mt-2 font-semibold" style={{ fontSize: 14 }}>
                  Equivale a 10× o mensal · 2 meses grátis
                </div>
                <div className="text-[#475569] mt-1" style={{ fontSize: 13 }}>
                  Poupança vs 12 meses: {formatPrice(monthlyConverted * 2, currency)}
                </div>
              </div>

              {modulesWithoutPrice.length > 0 && (
                <div className="rounded-2xl border-2 border-dashed border-[#FCA5A5] bg-[#FEF2F2] p-4">
                  <div className="font-semibold text-[#991B1B]" style={{ fontSize: 13 }}>
                    {modulesWithoutPrice.length} módulo{modulesWithoutPrice.length === 1 ? '' : 's'} sem preço
                  </div>
                  <div className="text-[#7F1D1D]/80 mt-1" style={{ fontSize: 12 }}>
                    Não incluído{modulesWithoutPrice.length === 1 ? '' : 's'} no total. Define preço no slide para somar.
                  </div>
                </div>
              )}

              <div className="text-[#64748B] text-center" style={{ fontSize: 12 }}>
                Valores indicativos · {intervalLabel('annual')}
              </div>
            </div>
          </div>
        )}
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Resumo do investimento" />
    </SlideShell>
  );
}
