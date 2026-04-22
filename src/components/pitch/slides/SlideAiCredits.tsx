import { PitchTokens, fillToken, DEFAULT_PRICING_PLANS } from '@/lib/pitch/tokens';
import { resolveSlideContent, interpolate } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import {
  getCurrencyMeta,
  formatPrice,
  type PitchCurrency,
} from '@/lib/pitch/pricing';
import {
  buildPlanBreakdown,
  getSelectedPlan,
  parseAiCreditPacks,
  DEFAULT_AI_CREDIT_PACKS,
} from '@/lib/pitch/planSummary';
import {
  Sparkles,
  Mail,
  PenLine,
  Search,
  FileText,
  Bot,
  TrendingUp,
} from 'lucide-react';

interface UseCase {
  icon: typeof Sparkles;
  title: string;
  cost: number; // créditos por ação
  desc: string;
}

const DEFAULT_ICONS = [Mail, PenLine, Search, FileText, Bot, TrendingUp];

const DEFAULT_USE_CASES: UseCase[] = [
  { icon: Mail, title: 'Email outbound personalizado', cost: 2, desc: 'Geração com contexto do lead' },
  { icon: PenLine, title: 'Resposta sugerida na inbox', cost: 1, desc: 'Sugestão contextual instantânea' },
  { icon: Search, title: 'Enriquecimento de lead', cost: 5, desc: 'Pesquisa web + síntese' },
  { icon: FileText, title: 'Resumo de conversa', cost: 3, desc: 'Resumo + próximos passos' },
  { icon: Bot, title: 'Sequência AI SDR (passo)', cost: 4, desc: 'Mensagem + follow-up automático' },
  { icon: TrendingUp, title: 'Análise de risco do negócio', cost: 8, desc: 'Pipeline Risk Engine' },
];

/**
 * Parse de um SlideItem editado: o `text` segue a convenção "<custo>|descrição".
 * Tolera apenas descrição (custo = 0) ou apenas número.
 */
function parseUseCaseItem(
  item: { title: string; text: string },
  fallbackIcon: typeof Sparkles
): UseCase {
  const raw = (item.text ?? '').trim();
  const m = raw.match(/^\s*(\d+)\s*[|:·\-–]\s*(.*)$/);
  if (m) {
    return {
      icon: fallbackIcon,
      title: item.title || '—',
      cost: parseInt(m[1], 10) || 0,
      desc: m[2].trim(),
    };
  }
  // Sem separador: tenta número puro, senão assume tudo descrição.
  const onlyNumber = raw.match(/^\s*(\d+)\s*$/);
  return {
    icon: fallbackIcon,
    title: item.title || '—',
    cost: onlyNumber ? parseInt(onlyNumber[1], 10) : 0,
    desc: onlyNumber ? '' : raw,
  };
}

export function SlideAiCredits({
  tokens,
  pageNumber,
  total,
}: {
  tokens: PitchTokens;
  pageNumber: number;
  total: number;
}) {
  const company = fillToken(tokens.companyName, 'a sua empresa');
  const c = resolveSlideContent('ai-credits', tokens.slideOverrides);
  const title = interpolate(c.title || 'Créditos IA — combustível da plataforma', { company });
  const subtitle = interpolate(
    c.subtitle ||
      'Cada ação de IA consome créditos. O plano inclui um saldo mensal e pode comprar pacotes extra a qualquer momento.',
    { company }
  );
  const eyebrow = c.eyebrow || 'Inteligência Artificial';

  const currency: PitchCurrency = tokens.currency || 'EUR';
  const fxRate = getCurrencyMeta(currency).rate;

  const plans = tokens.pricingPlans && tokens.pricingPlans.length > 0 ? tokens.pricingPlans : DEFAULT_PRICING_PLANS;
  const selectedPlan = getSelectedPlan(plans);
  const planBreak = selectedPlan ? buildPlanBreakdown(selectedPlan) : undefined;

  const packs = parseAiCreditPacks(c.priceNote) ?? DEFAULT_AI_CREDIT_PACKS;

  // Casos de uso editáveis: lê de slideOverrides.items, faz parse "<custo>|descrição".
  // Mantém ícones default por posição.
  const items = (c.items && c.items.length > 0) ? c.items : null;
  const useCases: UseCase[] = items
    ? items.map((it, i) => parseUseCaseItem(it, DEFAULT_ICONS[i % DEFAULT_ICONS.length]))
    : DEFAULT_USE_CASES;

  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '80px 70px' }}>
        <SlideHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />

        <div className="grid mt-4" style={{ gridTemplateColumns: '1fr 460px', gap: 28 }}>
          {/* ========== Coluna esquerda: incluído + casos de uso ========== */}
          <div className="space-y-4">
            {/* Card: Créditos incluídos no plano */}
            <div className="rounded-2xl border-2 border-[#A78BFA] bg-gradient-to-br from-[#EDE9FE] to-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div
                    className="uppercase tracking-[0.18em] text-[#6D28D9] font-semibold flex items-center gap-1.5"
                    style={{ fontSize: 11 }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Incluído no plano {planBreak?.plan.name ?? ''}
                  </div>
                  <div className="font-black text-[#0F172A] mt-1 leading-none" style={{ fontSize: 44 }}>
                    {planBreak?.aiCreditsCount
                      ? planBreak.aiCreditsCount.toLocaleString('pt-PT')
                      : planBreak?.aiCreditsLabel ?? '—'}
                  </div>
                  <div className="text-[#6D28D9] mt-1 font-semibold" style={{ fontSize: 13 }}>
                    créditos / mês · renovação automática
                  </div>
                </div>
                <div
                  className="rounded-xl bg-[#6D28D9] text-white px-3 py-2 text-center flex-shrink-0"
                  style={{ minWidth: 100 }}
                >
                  <div className="font-black" style={{ fontSize: 22 }}>
                    1
                  </div>
                  <div className="uppercase tracking-wider" style={{ fontSize: 9 }}>
                    crédito ≈
                  </div>
                  <div className="font-semibold mt-0.5" style={{ fontSize: 11 }}>
                    1 ação simples
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[#C4B5FD]/60 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[#6D28D9] uppercase tracking-wider font-semibold" style={{ fontSize: 9 }}>
                    Não acumulam
                  </div>
                  <div className="text-[#0F172A] font-medium mt-0.5" style={{ fontSize: 12 }}>
                    Renovam todo o mês
                  </div>
                </div>
                <div>
                  <div className="text-[#6D28D9] uppercase tracking-wider font-semibold" style={{ fontSize: 9 }}>
                    Top-up extra
                  </div>
                  <div className="text-[#0F172A] font-medium mt-0.5" style={{ fontSize: 12 }}>
                    Sem expiração
                  </div>
                </div>
                <div>
                  <div className="text-[#6D28D9] uppercase tracking-wider font-semibold" style={{ fontSize: 9 }}>
                    Visibilidade
                  </div>
                  <div className="text-[#0F172A] font-medium mt-0.5" style={{ fontSize: 12 }}>
                    Saldo em tempo real
                  </div>
                </div>
              </div>
            </div>

            {/* Casos de uso típicos */}
            <div className="rounded-2xl border-2 border-[#E2E8F0] bg-white overflow-hidden">
              <div className="px-5 py-2.5 border-b-2 border-[#E2E8F0] bg-[#F8FAFC]">
                <div
                  className="font-semibold uppercase tracking-wider text-[#64748B]"
                  style={{ fontSize: 11 }}
                >
                  Custo típico por ação de IA
                </div>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {useCases.map((u, i) => {
                  const Icon = u.icon;
                  return (
                    <div
                      key={i}
                      className="px-5 py-2 grid items-center"
                      style={{ gridTemplateColumns: '32px 1fr auto', columnGap: 12, fontSize: 13 }}
                    >
                      <div
                        className="flex items-center justify-center rounded-lg bg-[#EDE9FE] text-[#6D28D9]"
                        style={{ width: 32, height: 32 }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#0F172A] truncate">{u.title}</div>
                        <div className="text-[#64748B]" style={{ fontSize: 11 }}>
                          {u.desc}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className="font-mono tabular-nums font-bold text-[#6D28D9] bg-[#EDE9FE] rounded-md px-2 py-0.5"
                          style={{ fontSize: 13 }}
                        >
                          {u.cost} {u.cost === 1 ? 'crédito' : 'créditos'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-[#64748B]" style={{ fontSize: 11 }}>
              ✦ Custos indicativos. Variam ligeiramente conforme o modelo de IA escolhido (Gemini, GPT, etc.).
            </div>
          </div>

          {/* ========== Coluna direita: pacotes extra ========== */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-5">
              <div
                className="uppercase tracking-[0.2em] text-[#C4B5FD] font-semibold mb-1 flex items-center gap-1.5"
                style={{ fontSize: 11 }}
              >
                <Sparkles className="w-3 h-3" />
                Comprar créditos extra
              </div>
              <div className="text-white/80 mb-3" style={{ fontSize: 12 }}>
                Top-up imediato. Sem renovação automática. Não expiram.
              </div>

              <div className="space-y-2">
                {packs.map((p, i) => {
                  const priceConv = p.priceEur * fxRate;
                  const perCredit = p.priceEur > 0 ? p.priceEur / p.credits : 0;
                  const isBest = i === 1; // destaque no pacote do meio
                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-3 flex items-center justify-between ${
                        isBest
                          ? 'bg-[#A78BFA] text-[#0F172A] ring-2 ring-white/40'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black" style={{ fontSize: 22 }}>
                            {p.credits.toLocaleString('pt-PT')}
                          </span>
                          <span className={`font-semibold ${isBest ? 'text-[#4C1D95]' : 'text-white/80'}`} style={{ fontSize: 11 }}>
                            créditos
                          </span>
                          {isBest && (
                            <span
                              className="rounded-full bg-[#0F172A] text-white px-2 py-0.5 font-bold uppercase tracking-wider"
                              style={{ fontSize: 9 }}
                            >
                              Popular
                            </span>
                          )}
                        </div>
                        {perCredit > 0 && (
                          <div className={isBest ? 'text-[#4C1D95]' : 'text-white/60'} style={{ fontSize: 10 }}>
                            {formatPrice(perCredit * fxRate, currency)} por crédito
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-mono tabular-nums font-black" style={{ fontSize: 22 }}>
                          {formatPrice(priceConv, currency)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-white/10 text-white/60" style={{ fontSize: 10 }}>
                Compra direta na app · ativação imediata · IVA não incluído.
              </div>
            </div>

            {/* Mini-FAQ */}
            <div className="rounded-2xl border-2 border-[#E2E8F0] bg-white p-4 space-y-2.5">
              <div className="uppercase tracking-[0.18em] text-[#64748B] font-semibold" style={{ fontSize: 10 }}>
                Como funciona
              </div>

              <div>
                <div className="font-semibold text-[#0F172A]" style={{ fontSize: 12 }}>
                  Quando consome créditos?
                </div>
                <div className="text-[#64748B] mt-0.5" style={{ fontSize: 11 }}>
                  Apenas em ações de IA — geração, análise, enriquecimento.
                  Operações normais do CRM são gratuitas.
                </div>
              </div>

              <div>
                <div className="font-semibold text-[#0F172A]" style={{ fontSize: 12 }}>
                  Acabaram a meio do mês?
                </div>
                <div className="text-[#64748B] mt-0.5" style={{ fontSize: 11 }}>
                  Compra um pacote extra e continua sem interrupção.
                </div>
              </div>

              <div>
                <div className="font-semibold text-[#0F172A]" style={{ fontSize: 12 }}>
                  Posso desativar a IA?
                </div>
                <div className="text-[#64748B] mt-0.5" style={{ fontSize: 11 }}>
                  Sim — por utilizador ou por funcionalidade.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Créditos IA" />
    </SlideShell>
  );
}
