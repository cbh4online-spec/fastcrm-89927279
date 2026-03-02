import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Zap, Sparkles, Crown, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ONBOARDING_BUNDLES } from "@/config/extensionPacks";
import { useActivePricingPlans } from "@/hooks/usePlatformPricing";

const iconMap: Record<string, React.ElementType> = { Zap, Sparkles, Crown };

const fallbackPlans = [
  {
    nameKey: "starter", price: "€0", color: "hsl(142, 76%, 36%)", icon: Zap,
    featureKeys: ["f_users_1_3", "f_crm_core", "f_basic_health", "f_1_pipeline", "f_3_automations", "f_500_emails"],
    ctaKey: "startFree", ctaLink: "/auth",
  },
  {
    nameKey: "growth", price: "€49", priceNote: true, color: "hsl(221, 83%, 53%)", icon: Sparkles,
    highlighted: true, badgeKey: "mostPopular",
    featureKeys: ["f_10_users", "f_multi_pipeline", "f_stage_benchmarks", "f_adv_automation", "f_marketplace", "f_ai_suggestions", "f_500_ai", "f_5000_emails"],
    ctaKey: "startFreeUpgrade", ctaLink: "/auth",
  },
  {
    nameKey: "scale", price: "€149", priceNote: true, color: "hsl(250, 83%, 60%)", icon: Crown,
    badgeKey: "enterprise",
    featureKeys: ["f_unlimited_users", "f_adv_intelligence", "f_adv_automations", "f_api_access", "f_adv_roles", "f_priority_support", "f_white_label", "f_5000_ai"],
    ctaKey: "startFreeUpgrade", ctaLink: "/auth",
  },
];

export function LandingPricingSection() {
  const { t } = useTranslation("landing");
  const { data: dbPlans } = useActivePricingPlans();

  // Build plans from DB if available, otherwise use fallback
  const plans = (dbPlans && dbPlans.length > 0)
    ? dbPlans.map((dp) => {
        const meta = (dp.metadata || {}) as Record<string, any>;
        const Icon = iconMap[meta.icon] || Zap;
        return {
          nameKey: dp.config_key,
          price: `€${dp.price_monthly}`,
          priceNote: dp.price_monthly > 0,
          color: meta.color || "hsl(221, 83%, 53%)",
          icon: Icon,
          highlighted: dp.is_highlighted,
          badgeKey: meta.badge || null,
          // Use DB features directly instead of i18n keys
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
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block">{t("pricing.badge")}</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4 text-[hsl(210,40%,98%)]">
            {t("pricing.title")}
          </h2>
          <p className="text-lg text-[hsl(210,40%,98%)/0.6] max-w-xl mx-auto">
            {t("pricing.subtitle")}
          </p>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
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
                    <span className="text-3xl font-bold text-[hsl(210,40%,98%)]">{plan.price}</span>
                    {plan.priceNote && (
                      <span className="text-sm text-[hsl(210,40%,98%)/0.5]">{t("pricing.perMonth")}</span>
                    )}
                  </div>
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
                    className={`w-full font-bold uppercase tracking-wide h-11 ${
                      plan.highlighted
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]"
                        : "bg-[hsl(210,40%,98%)/0.1] text-[hsl(210,40%,98%)] hover:bg-[hsl(210,40%,98%)/0.15] border border-[hsl(210,40%,98%)/0.1]"
                    }`}
                  >
                    {t(`pricing.${plan.ctaKey}`)}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>
            );
          })}
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
    </section>
  );
}
