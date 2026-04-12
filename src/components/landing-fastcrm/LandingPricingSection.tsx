import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Zap, Sparkles, Crown, ArrowRight, Star, ChevronDown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ONBOARDING_BUNDLES } from "@/config/extensionPacks";
import { useActivePricingPlans } from "@/hooks/usePlatformPricing";

const iconMap: Record<string, React.ElementType> = { Zap, Sparkles, Crown };

const fallbackPlans = [
  {
    nameKey: "starter", priceMonthly: 0, color: "hsl(142, 76%, 36%)", icon: Zap,
    featureKeys: [] as string[],
    directFeatures: [
      "Até 3 utilizadores",
      "CRM completo com contactos e empresas",
      "1 pipeline de vendas",
      "Gestão de tarefas e atividades",
      "Health Score básico dos deals",
      "3 automações ativas",
      "500 emails/mês",
      "Relatórios essenciais",
    ],
    ctaText: "Começar Grátis – Plano Starter", ctaLink: "/auth",
  },
  {
    nameKey: "growth", priceMonthly: 149, priceNote: true, color: "hsl(221, 83%, 53%)", icon: Sparkles,
    highlighted: true, badgeKey: "mostPopular",
    featureKeys: [] as string[],
    directFeatures: [
      "Até 10 utilizadores",
      "Pipelines múltiplos ilimitados",
      "Benchmarks por etapa do funil",
      "Automações avançadas ilimitadas",
      "Marketplace de extensões",
      "Sugestões de IA por deal",
      "500 créditos IA/mês",
      "5.000 emails/mês",
      "Integrações (WhatsApp, Email, Calendário)",
      "Dashboards personalizáveis",
    ],
    ctaText: "Começar Grátis – Plano Growth", ctaLink: "/auth",
  },
  {
    nameKey: "scale", priceMonthly: 299, priceNote: true, color: "hsl(250, 83%, 60%)", icon: Crown,
    badgeKey: "enterprise",
    featureKeys: [] as string[],
    directFeatures: [
      "Utilizadores ilimitados",
      "Revenue Intelligence avançada",
      "Automações e workflows ilimitados",
      "Acesso completo à API",
      "Roles e permissões avançadas",
      "Suporte prioritário dedicado",
      "White-label e branding custom",
      "5.000 créditos IA/mês",
      "Relatórios e forecasting com IA",
      "SSO e segurança enterprise",
    ],
    ctaText: "Contactar Vendas", ctaLink: "/auth",
  },
];

const ANNUAL_DISCOUNT = 0.2;

function formatPrice(monthly: number, isAnnual: boolean): string {
  if (monthly === 0) return "€0";
  const price = isAnnual ? Math.round(monthly * (1 - ANNUAL_DISCOUNT)) : monthly;
  return `€${price}`;
}

export function LandingPricingSection() {
  const { t } = useTranslation("landing");
  const { data: dbPlans } = useActivePricingPlans();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = (dbPlans && dbPlans.length > 0)
    ? dbPlans.map((dp) => {
        const meta = (dp.metadata || {}) as Record<string, any>;
        const Icon = iconMap[meta.icon] || Zap;
        return {
          nameKey: dp.config_key,
          priceMonthly: dp.price_monthly,
          priceNote: dp.price_monthly > 0,
          color: meta.color || "hsl(221, 83%, 53%)",
          icon: Icon,
          highlighted: dp.is_highlighted,
          badgeKey: meta.badge || null,
          directFeatures: dp.features as string[],
          featureKeys: [] as string[],
          ctaKey: meta.cta_key || "startFree",
          ctaLink: "/auth",
        };
      })
    : fallbackPlans.map((p) => ({ ...p, directFeatures: null as string[] | null }));

  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-6 text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.2)] rounded-full px-5 py-2 mb-6">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-semibold text-[hsl(var(--primary))]">
              Mais de 500 empresas portuguesas já usam o FastCRM — Junte-se a elas hoje
            </span>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block">{t("pricing.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4 text-[hsl(210,40%,98%)]">
            {t("pricing.title")}
          </h2>
          <p className="text-lg text-[hsl(210,40%,98%)/0.6] max-w-xl mx-auto mb-8">
            {t("pricing.subtitle")}
          </p>

          {/* Toggle Mensal / Anual */}
          <div className="inline-flex items-center gap-3 bg-[hsl(210,40%,98%)/0.05] border border-[hsl(210,40%,98%)/0.1] rounded-full p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                !isAnnual
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md"
                  : "text-[hsl(210,40%,98%)/0.6] hover:text-[hsl(210,40%,98%)]"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                isAnnual
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md"
                  : "text-[hsl(210,40%,98%)/0.6] hover:text-[hsl(210,40%,98%)]"
              }`}
            >
              Anual
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                Poupe 20%
              </Badge>
            </button>
          </div>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const displayPrice = formatPrice(plan.priceMonthly, isAnnual);
            return (
              <motion.div
                key={plan.nameKey}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] shadow-[0_0_40px_hsl(var(--primary)/0.15)]"
                    : "border-[hsl(210,40%,98%)/0.08] bg-[hsl(210,40%,98%)/0.03]"
                }`}
              >
                {plan.badgeKey && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`text-xs px-3 py-1 ${
                      plan.highlighted 
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        : "bg-[hsl(250,83%,60%)] text-white"
                    }`}>
                      {plan.highlighted && <Star className="w-3 h-3 mr-1" />}
                      {t(`pricing.${plan.badgeKey}`)}
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-lg font-bold text-[hsl(210,40%,98%)] mb-1">{t(`pricing.${plan.nameKey}`)}</h4>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-[hsl(210,40%,98%)]">{displayPrice}</span>
                    {plan.priceNote && (
                      <span className="text-sm text-[hsl(210,40%,98%)/0.5]">
                        /{isAnnual ? "mês (faturado anualmente)" : t("pricing.perMonth")}
                      </span>
                    )}
                  </div>
                  {isAnnual && plan.priceMonthly > 0 && (
                    <p className="text-xs text-emerald-400">
                      Poupa €{Math.round(plan.priceMonthly * ANNUAL_DISCOUNT * 12)}/ano
                    </p>
                  )}
                  <p className="text-sm text-[hsl(210,40%,98%)/0.5]">{t(`pricing.${plan.nameKey}Sub`)}</p>
                </div>

                <div className="flex-1 mb-6">
                  <ul className="space-y-2.5">
                    {(plan.directFeatures && plan.directFeatures.length > 0
                      ? plan.directFeatures.map((f, fi) => (
                          <li key={fi} className="flex items-start gap-2.5 text-sm">
                            <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: plan.color }} />
                            <span className="text-[hsl(210,40%,98%)/0.75]">{f}</span>
                          </li>
                        ))
                      : plan.featureKeys.map((fk, fi) => (
                          <li key={fi} className="flex items-start gap-2.5 text-sm">
                            <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: plan.color }} />
                            <span className="text-[hsl(210,40%,98%)/0.75]">{t(`pricing.${fk}`)}</span>
                          </li>
                        ))
                    )}
                  </ul>
                </div>

                <Link to={plan.ctaLink} className="w-full">
                  <Button
                    className={`w-full font-bold uppercase tracking-wide h-auto min-h-[44px] py-2 px-4 text-sm whitespace-normal text-center ${
                      plan.highlighted
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]"
                        : "bg-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)] hover:bg-[hsl(210,40%,98%)/0.15] border border-[hsl(210,40%,98%)/0.1]"
                    }`}
                  >
                    <span className="truncate">{t(`pricing.${plan.ctaKey}`)}</span>
                    <ArrowRight className="h-4 w-4 ml-2 shrink-0" />
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-[hsl(210,40%,98%)/0.6]">
          <span>✅ 14 dias de teste grátis</span>
          <span>✅ Sem cartão de crédito</span>
          <span>✅ Cancele a qualquer momento</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            {
              name: "Ana Ferreira",
              role: "Directora Comercial, TechNova",
              quote: "O FastCRM transformou a forma como gerimos o nosso pipeline. Em 3 meses, aumentámos as conversões em 40%.",
              stars: 5,
            },
            {
              name: "Ricardo Santos",
              role: "CEO, DigitalPulse",
              quote: "Finalmente um CRM que entende o mercado português. A IA sugere os próximos passos e poupa-nos horas por semana.",
              stars: 5,
            },
            {
              name: "Marta Oliveira",
              role: "Head of Sales, GreenLogistics",
              quote: "Migrámos do HubSpot e não olhámos para trás. Mais simples, mais rápido, e metade do preço.",
              stars: 5,
            },
          ].map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="rounded-xl border border-[hsl(210,40%,98%)/0.08] bg-[hsl(210,40%,98%)/0.03] p-5"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: review.stars }).map((_, si) => (
                  <Star key={si} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-[hsl(210,40%,98%)/0.7] mb-4 italic">&ldquo;{review.quote}&rdquo;</p>
              <div>
                <p className="text-sm font-semibold text-[hsl(210,40%,98%)]">{review.name}</p>
                <p className="text-xs text-[hsl(210,40%,98%)/0.5]">{review.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h3 className="text-2xl font-bold text-[hsl(210,40%,98%)] mb-2">
            {t("pricing.extendBundles")}
          </h3>
          <p className="text-sm text-[hsl(210,40%,98%)/0.5]">
            {t("pricing.extendBundlesSub")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ONBOARDING_BUNDLES.map((bundle, i) => (
            <motion.div
              key={bundle.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-xl border border-[hsl(210,40%,98%)/0.08] bg-[hsl(210,40%,98%)/0.03] p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{bundle.icon}</span>
                <div>
                  <h4 className="font-semibold text-sm text-[hsl(210,40%,98%)]">{bundle.name}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[hsl(210,40%,98%)]">€{bundle.pricing.bundle_price}</span>
                    <span className="text-xs text-[hsl(210,40%,98%)/0.4]">{t("pricing.perMonth")}</span>
                    {bundle.pricing.discount_percent > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        {t("pricing.save", { percent: bundle.pricing.discount_percent })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <ul className="space-y-1.5">
                {bundle.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-xs text-[hsl(210,40%,98%)/0.6]">
                    <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ de Preços */}
      <div className="max-w-3xl mx-auto px-6 mt-20">
        <h3 className="text-2xl font-bold text-[hsl(210,40%,98%)] text-center mb-8">
          Perguntas Frequentes sobre Preços
        </h3>
        <div className="space-y-3">
          {[
            {
              q: "Preciso de cartão de crédito para começar?",
              a: "Não. O plano Starter é 100% gratuito e não requer cartão de crédito. Pode experimentar o FastCRM sem qualquer compromisso financeiro.",
            },
            {
              q: "Posso mudar de plano a qualquer momento?",
              a: "Sim. Pode fazer upgrade ou downgrade do seu plano a qualquer momento. No upgrade, a diferença é cobrada proporcionalmente. No downgrade, o crédito restante é aplicado no próximo ciclo.",
            },
            {
              q: "Como funciona a faturação anual?",
              a: "Ao escolher o plano anual, poupa 20% face ao pagamento mensal. O valor total do ano é faturado de uma só vez e emitimos fatura com NIF para empresas portuguesas.",
            },
            {
              q: "Existe um período de teste nos planos pagos?",
              a: "Sim. Todos os planos pagos incluem 14 dias de teste grátis com acesso completo a todas as funcionalidades. Pode cancelar antes do fim do período sem qualquer custo.",
            },
            {
              q: "Que métodos de pagamento aceitam?",
              a: "Aceitamos Visa, Mastercard, American Express e débito direto SEPA. Todos os pagamentos são processados de forma segura via Stripe. Emitimos fatura portuguesa com IVA incluído.",
            },
          ].map((faq, i) => (
            <PricingFaqItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>

      {/* Banner CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto px-6 mt-16"
      >
        <div className="rounded-2xl border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.05)] p-8 text-center">
          <h3 className="text-xl font-bold text-[hsl(210,40%,98%)] mb-2">
            Ainda tem dúvidas? Fale connosco
          </h3>
          <p className="text-sm text-[hsl(210,40%,98%)/0.6] mb-6 max-w-md mx-auto">
            A nossa equipa está disponível para o ajudar a escolher o plano ideal para o seu negócio.
          </p>
          <Link to="/auth">
            <Button className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)] font-bold px-8 h-12">
              <MessageCircle className="h-4 w-4 mr-2" />
              Agendar Demo Gratuita
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function PricingFaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[hsl(210,40%,98%)/0.08] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[hsl(210,40%,98%)/0.03] transition-colors"
      >
        <span className="text-sm font-medium text-[hsl(210,40%,98%)]">{question}</span>
        <ChevronDown className={`h-4 w-4 text-[hsl(210,40%,98%)/0.5] shrink-0 ml-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="px-4 pb-4 text-sm text-[hsl(210,40%,98%)/0.6] leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
