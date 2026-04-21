import { PitchTokens, fillToken, DEFAULT_PRICING_PLANS } from '@/lib/pitch/tokens';
import { resolveSlideContent, interpolate, DEFAULT_MODULE_PRICES } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import {
  getCurrencyMeta,
  TIERS,
  formatPrice,
  intervalLabel,
  parsePriceBreakdown,
  type PitchCurrency,
  type PitchTier,
} from '@/lib/pitch/pricing';
import { PITCH_SLIDES, DEFAULT_ENABLED_SLIDE_IDS } from './index';
import { buildPlanBreakdown, getSelectedPlan, DEFAULT_PLAN_SETUP_EUR } from '@/lib/pitch/planSummary';

interface LineItem {
  id: string;
  title: string;
  category: 'module' | 'vertical' | 'pack';
  monthlyEurBase: number;
  setupEurBase: number;
  annualEurBase: number;
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
    c.subtitle || 'Plano base + módulos ativos + setup + créditos IA, no plano selecionado.',
    { company }
  );
  const eyebrow = c.eyebrow || 'Investimento total';

  const enabled = tokens.enabledSlides ?? DEFAULT_ENABLED_SLIDE_IDS;
  const currency: PitchCurrency = tokens.currency || 'EUR';
  const tier: PitchTier = tokens.tier || 'grow';
  const tierMult = TIERS[tier].multiplier;
  const fxRate = getCurrencyMeta(currency).rate;

  const overrides = tokens.slideOverrides || {};

  /* ---------- Plano base ---------- */
  const plans = (tokens.pricingPlans && tokens.pricingPlans.length > 0) ? tokens.pricingPlans : DEFAULT_PRICING_PLANS;
  const selectedPlan = getSelectedPlan(plans);
  const planBreak = selectedPlan ? buildPlanBreakdown(selectedPlan) : undefined;

  // Permite override do nº utilizadores via priceNote do slide ("users:12") e do setup via price ("€1990 setup").
  const overrideUsersMatch = c.priceNote?.match(/users?\s*[:=]\s*(\d+)/i);
  const overrideUsers = overrideUsersMatch ? parseInt(overrideUsersMatch[1], 10) : undefined;
  const planUsers = overrideUsers && overrideUsers > 0 ? overrideUsers : (planBreak?.users ?? 1);
  const planMonthlyBaseEur = (planBreak?.pricePerUserEur ?? 0) * planUsers;

  const overrideSetupEur = c.price ? parsePriceBreakdown(c.price).setupEur : 0;
  const planSetupBaseEur = overrideSetupEur > 0 ? overrideSetupEur : (DEFAULT_PLAN_SETUP_EUR[tier] ?? 0);

  const planMonthlyConverted = planMonthlyBaseEur * fxRate; // tier já implícito no plano selecionado
  const planSetupConverted = planSetupBaseEur * fxRate;

  /* ---------- Módulos opcionais ---------- */
  const items: LineItem[] = PITCH_SLIDES
    .filter((s) => s.category !== 'core' && enabled.includes(s.id))
    .map((s) => {
      const ov = overrides[s.id];
      const effective = ov?.price ?? DEFAULT_MODULE_PRICES[s.id]?.price;
      const breakdown = parsePriceBreakdown(effective);
      return {
        id: s.id,
        title: s.title,
        category: s.category as LineItem['category'],
        monthlyEurBase: breakdown.monthlyEur,
        setupEurBase: breakdown.setupEur,
        annualEurBase: breakdown.annualEur,
        hasPrice: breakdown.hasAmount,
      };
    });

  const modulesMonthlyEur = items.reduce((acc, it) => acc + it.monthlyEurBase, 0);
  const modulesSetupEur = items.reduce((acc, it) => acc + it.setupEurBase, 0);
  const modulesAnnualExplicitEur = items.reduce((acc, it) => acc + it.annualEurBase, 0);

  const modulesMonthlyConverted = modulesMonthlyEur * tierMult * fxRate;
  const modulesAnnualExplicitConverted = modulesAnnualExplicitEur * tierMult * fxRate;
  const modulesSetupConverted = modulesSetupEur * tierMult * fxRate;

  /* ---------- Totais ---------- */
  const totalMonthlyConverted = planMonthlyConverted + modulesMonthlyConverted;
  const totalAnnualRecurring = totalMonthlyConverted * 10 + modulesAnnualExplicitConverted;
  const totalSetupConverted = planSetupConverted + modulesSetupConverted;
  const annualSavings = totalMonthlyConverted * 2;

  const modulesWithoutPrice = items.filter((it) => !it.hasPrice);
  const itemsWithSetup = items.filter((it) => it.setupEurBase > 0);
  const activeOptionalCount = items.length;

  const sorted = [...items].sort(
    (a, b) => b.monthlyEurBase + b.annualEurBase / 10 - (a.monthlyEurBase + a.annualEurBase / 10)
  );
  const visibleModules = sorted.slice(0, 8);
  const hiddenCount = sorted.length - visibleModules.length;

  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '80px 70px' }}>
        <SlideHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

        <div className="grid mt-4" style={{ gridTemplateColumns: '1fr 420px', gap: 28 }}>
          {/* ====================== Coluna esquerda — composição ====================== */}
          <div className="space-y-4">
            {/* Plano base */}
            {planBreak && planMonthlyBaseEur > 0 && (
              <div className="rounded-2xl border-2 border-[#0EA5E9] bg-gradient-to-br from-[#E0F2FE] to-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="uppercase tracking-[0.18em] text-[#0369A1] font-semibold" style={{ fontSize: 11 }}>
                      Plano base
                    </div>
                    <div className="font-bold text-[#0F172A] mt-1" style={{ fontSize: 22 }}>
                      {planBreak.plan.name}
                      <span className="text-[#475569] font-medium" style={{ fontSize: 14 }}>
                        {' '}· {formatPrice(planBreak.pricePerUserEur * fxRate, currency)}/utilizador · {planUsers} {planUsers === 1 ? 'utilizador' : 'utilizadores'}
                      </span>
                    </div>
                    {planBreak.aiCreditsLabel && (
                      <div className="text-[#0369A1] mt-1 font-medium" style={{ fontSize: 13 }}>
                        ✦ {planBreak.aiCreditsLabel}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono tabular-nums font-black text-[#0F172A]" style={{ fontSize: 28 }}>
                      {formatPrice(planMonthlyConverted, currency)}
                    </div>
                    <div className="text-[#64748B]" style={{ fontSize: 11 }}>/mês</div>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de módulos */}
            <div className="rounded-2xl border-2 border-[#E2E8F0] bg-white overflow-hidden">
              <div
                className="px-5 py-2.5 border-b-2 border-[#E2E8F0] bg-[#F8FAFC] grid"
                style={{ gridTemplateColumns: '1fr auto auto', columnGap: 16, fontSize: 12 }}
              >
                <div className="font-semibold uppercase tracking-wider text-[#64748B]">
                  {activeOptionalCount > 0 ? `Módulos ativos (${activeOptionalCount})` : 'Módulos ativos'}
                </div>
                <div className="font-semibold uppercase tracking-wider text-[#64748B] text-right">Setup</div>
                <div className="font-semibold uppercase tracking-wider text-[#64748B] text-right">Mensal</div>
              </div>
              {activeOptionalCount === 0 ? (
                <div className="p-5 text-center text-[#94A3B8]" style={{ fontSize: 14 }}>
                  Sem módulos opcionais — apenas o plano base.
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {visibleModules.map((it) => {
                    const monthlyConv = it.monthlyEurBase * tierMult * fxRate;
                    const setupConv = it.setupEurBase * tierMult * fxRate;
                    return (
                      <div
                        key={it.id}
                        className="px-5 py-2 grid items-center"
                        style={{ gridTemplateColumns: '1fr auto auto', columnGap: 16, fontSize: 14 }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block rounded-full px-1.5 py-0.5 font-semibold uppercase tracking-wider flex-shrink-0"
                            style={{
                              fontSize: 9,
                              background:
                                it.category === 'module' ? '#E0F2FE' : it.category === 'vertical' ? '#FEF3C7' : '#F3E8FF',
                              color:
                                it.category === 'module' ? '#0369A1' : it.category === 'vertical' ? '#92400E' : '#6B21A8',
                            }}
                          >
                            {it.category === 'module' ? 'Mód' : it.category === 'vertical' ? 'Vert' : 'Pack'}
                          </span>
                          <span className="truncate text-[#0F172A]">{it.title}</span>
                        </div>
                        <div className="font-mono tabular-nums text-[#64748B] text-right">
                          {it.setupEurBase > 0 ? formatPrice(setupConv, currency) : '—'}
                        </div>
                        <div className="font-mono tabular-nums font-semibold text-[#0F172A] text-right">
                          {it.monthlyEurBase > 0 ? formatPrice(monthlyConv, currency) : '—'}
                        </div>
                      </div>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <div className="px-5 py-1.5 text-[#64748B] text-center" style={{ fontSize: 12 }}>
                      + {hiddenCount} módulo{hiddenCount === 1 ? '' : 's'} adicional{hiddenCount === 1 ? '' : 'is'}…
                    </div>
                  )}

                  {/* Subtotal módulos */}
                  <div
                    className="px-5 py-2 grid items-center bg-[#F1F5F9] font-semibold"
                    style={{ gridTemplateColumns: '1fr auto auto', columnGap: 16, fontSize: 13 }}
                  >
                    <div className="text-[#475569]">Subtotal módulos</div>
                    <div className="font-mono tabular-nums text-[#0F172A] text-right">
                      {modulesSetupConverted > 0 ? formatPrice(modulesSetupConverted, currency) : '—'}
                    </div>
                    <div className="font-mono tabular-nums text-[#0F172A] text-right">
                      {formatPrice(modulesMonthlyConverted, currency)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Avisos */}
            {modulesWithoutPrice.length > 0 && (
              <div className="rounded-xl border-2 border-dashed border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2">
                <div className="text-[#991B1B] font-semibold" style={{ fontSize: 12 }}>
                  {modulesWithoutPrice.length} módulo{modulesWithoutPrice.length === 1 ? '' : 's'} sem preço — não somam ao total.
                </div>
              </div>
            )}
          </div>

          {/* ====================== Coluna direita — totais ====================== */}
          <div className="space-y-3">
            {/* Total mensal global */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-6">
              <div className="uppercase tracking-[0.2em] text-[#22D3EE] font-semibold mb-1" style={{ fontSize: 11 }}>
                Total mensal
              </div>
              <div className="font-black leading-none" style={{ fontSize: 48 }}>
                {formatPrice(totalMonthlyConverted, currency)}
              </div>
              <div className="text-white/70 mt-2" style={{ fontSize: 12 }}>
                Plano base ({formatPrice(planMonthlyConverted, currency)}) + módulos ({formatPrice(modulesMonthlyConverted, currency)})
              </div>
              <div className="text-white/50 mt-1" style={{ fontSize: 11 }}>
                {planUsers} {planUsers === 1 ? 'utilizador' : 'utilizadores'} · plano {TIERS[tier].label} · {getCurrencyMeta(currency).code}
              </div>
            </div>

            {/* Total anual */}
            <div className="rounded-2xl border-2 border-[#22D3EE] bg-gradient-to-br from-[#CFFAFE] to-white p-5">
              <div className="uppercase tracking-[0.2em] text-[#0E7490] font-semibold mb-1" style={{ fontSize: 11 }}>
                Total anual recorrente
              </div>
              <div className="font-black text-[#0F172A] leading-none" style={{ fontSize: 38 }}>
                {formatPrice(totalAnnualRecurring, currency)}
              </div>
              <div className="text-[#0E7490] mt-1.5 font-semibold" style={{ fontSize: 12 }}>
                Equivale a 10× o mensal · 2 meses grátis
              </div>
              <div className="text-[#475569] mt-0.5" style={{ fontSize: 11 }}>
                Poupança vs 12×: {formatPrice(annualSavings, currency)}
              </div>
            </div>

            {/* Setup total */}
            <div className="rounded-2xl border-2 border-[#FBBF24] bg-gradient-to-br from-[#FEF3C7] to-white p-5">
              <div className="uppercase tracking-[0.2em] text-[#92400E] font-semibold mb-1" style={{ fontSize: 11 }}>
                Setup único (one-time)
              </div>
              <div className="font-black text-[#0F172A] leading-none" style={{ fontSize: 38 }}>
                {formatPrice(totalSetupConverted, currency)}
              </div>
              <div className="text-[#92400E] mt-1.5 font-semibold" style={{ fontSize: 12 }}>
                Plano ({formatPrice(planSetupConverted, currency)}){itemsWithSetup.length > 0 && ` + ${itemsWithSetup.length} módulo${itemsWithSetup.length === 1 ? '' : 's'} (${formatPrice(modulesSetupConverted, currency)})`}
              </div>
              <div className="text-[#78350F]/80 mt-0.5" style={{ fontSize: 11 }}>
                Inclui implementação, configuração e ativação.
              </div>
            </div>

            {/* Créditos IA */}
            {planBreak?.aiCreditsLabel && (
              <div className="rounded-2xl border-2 border-[#A78BFA] bg-gradient-to-br from-[#EDE9FE] to-white p-4">
                <div className="uppercase tracking-[0.2em] text-[#6D28D9] font-semibold mb-1" style={{ fontSize: 11 }}>
                  Créditos IA incluídos
                </div>
                <div className="font-black text-[#0F172A] leading-none" style={{ fontSize: 26 }}>
                  {planBreak.aiCreditsCount ? planBreak.aiCreditsCount.toLocaleString('pt-PT') : planBreak.aiCreditsLabel}
                </div>
                <div className="text-[#6D28D9] mt-0.5 font-semibold" style={{ fontSize: 11 }}>
                  por mês · renovação automática
                </div>
              </div>
            )}

            <div className="text-[#64748B] text-center" style={{ fontSize: 11 }}>
              Valores indicativos · {intervalLabel('annual')}
            </div>
          </div>
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Resumo do investimento" />
    </SlideShell>
  );
}
