import { useState } from "react";
import pricingBg from "@/assets/pricing-bg.jpg";
import { motion } from "framer-motion";
import { 
  AlertTriangle, Check, Crown, Building2, Rocket, Zap,
  ArrowRight, Shield, Puzzle, Brain, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { QualificationModal } from "./QualificationModal";

const painPoints = [
  "Leads perdidos por falta de acompanhamento",
  "Processos manuais que consomem horas da equipa",
  "Comunicação dispersa entre plataformas",
  "Falta de visibilidade sobre resultados reais",
  "Oportunidades que desaparecem sem rastreio",
];

const plans = [
  {
    name: "Free",
    price: "0€",
    subtitle: "Para experimentar a base do sistema.",
    color: "hsl(142, 76%, 36%)",
    icon: Zap,
    features: [
      "1 utilizador",
      "100 contactos",
      "1 pipeline",
      "10 oportunidades ativas",
      "1 automação simples",
      "200 AI credits/mês",
      "Email básico",
      "Dashboard essencial",
    ],
    cta: "Criar Workspace Gratuito",
    ctaLink: "/auth",
    ctaVariant: "outline" as const,
    note: "Plano ideal para testar funcionalidades base.",
  },
  {
    name: "Business",
    price: "129€",
    priceNote: "/mês*",
    subtitle: "Para equipas que precisam de estrutura real.",
    color: "hsl(221, 83%, 53%)",
    icon: Rocket,
    features: [
      "Até 10 utilizadores",
      "Até 5.000 contactos",
      "5 pipelines",
      "25 automações",
      "WhatsApp + Instagram",
      "Portal Cliente",
      "Loja Online",
      "5.000 AI credits/mês",
      "Relatórios operacionais",
    ],
    cta: "Ver Possibilidades",
    ctaLink: "/auth",
    ctaVariant: "outline" as const,
    note: "*Valor base indicativo. Ajustado consoante a estrutura necessária.",
  },
  {
    name: "Professional",
    price: "Personalizado",
    subtitle: "Recomendado para empresas em crescimento.",
    color: "hsl(250, 83%, 60%)",
    icon: Crown,
    highlighted: true,
    badge: "Mais Escolhido",
    features: [
      "Até 25 utilizadores",
      "Até 25.000 contactos",
      "Automações avançadas",
      "Knowledge Base com IA",
      "AI Sales Coach",
      "Lead Enricher",
      "API Access",
      "Multi-workspace (até 5)",
      "20.000 AI credits/mês",
    ],
    cta: "Solicitar Proposta Estratégica",
    ctaLink: "/auth",
    ctaVariant: "default" as const,
    note: null,
  },
  {
    name: "Enterprise",
    price: "Sob Consulta",
    subtitle: "Infraestrutura empresarial completa.",
    color: "hsl(38, 92%, 50%)",
    icon: Building2,
    features: [
      "Utilizadores ilimitados*",
      "Contactos ilimitados*",
      "Workspaces ilimitados",
      "IA personalizada",
      "Edge functions dedicadas",
      "SLA prioritário",
      "White-label opcional",
      "Integrações custom",
    ],
    cta: "Falar com Especialista",
    ctaLink: "/auth",
    ctaVariant: "outline" as const,
    note: "*Aplicável política de uso responsável.",
    dark: true,
  },
];

const strategicReasons = [
  "Estrutura diferente",
  "Volume diferente",
  "Necessidades de IA distintas",
  "Integrações específicas",
  "Modelos operacionais próprios",
];

export function LandingPricingSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();

  const openQualification = (planKey: string) => {
    setSelectedPlan(planKey);
    setModalOpen(true);
  };

  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
      {/* Futuristic background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url(${pricingBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,20%,4%)] via-transparent to-[hsl(220,20%,4%)] pointer-events-none" />
      <QualificationModal open={modalOpen} onClose={() => setModalOpen(false)} prefilledPlan={selectedPlan} />
      {/* Pre-Anchor */}
      <div className="max-w-4xl mx-auto px-6 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.08)] mb-6">
            <AlertTriangle className="h-4 w-4 text-[hsl(var(--destructive))]" />
            <span className="text-sm font-medium text-[hsl(var(--destructive))]">Custo da inação</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold mb-8 text-[hsl(210,40%,98%)]">
            Quanto custa operar sem estrutura?
          </h3>
          <div className="grid gap-3 max-w-xl mx-auto text-left mb-8">
            {painPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="flex items-start gap-3"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--destructive))] mt-2 shrink-0" />
                <span className="text-[hsl(210,40%,98%)/0.7] text-sm md:text-base">{point}</span>
              </motion.div>
            ))}
          </div>
          <p className="text-[hsl(var(--warning))] font-medium text-sm md:text-base">
            A maioria das empresas perde milhares de euros por mês por não ter uma infraestrutura digital integrada.
          </p>
        </motion.div>
      </div>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-[hsl(210,40%,98%)]">
            A Estrutura Certa Para Cada Nível de Operação
          </h2>
          <p className="text-lg text-[hsl(210,40%,98%)/0.6] max-w-xl mx-auto">
            Comece simples.<br />Escale com inteligência.
          </p>
        </motion.div>
      </div>

      {/* Pricing Grid */}
      <div className="max-w-7xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] shadow-[0_0_40px_hsl(var(--primary)/0.15)]"
                    : plan.dark
                    ? "border-[hsl(210,40%,98%)/0.08] bg-[hsl(222,47%,4%)/0.8]"
                    : "border-[hsl(210,40%,98%)/0.08] bg-[hsl(210,40%,98%)/0.03]"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs px-3 py-1">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-lg font-bold text-[hsl(210,40%,98%)] mb-1">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold text-[hsl(210,40%,98%)]">
                      {plan.price}
                    </span>
                    {plan.priceNote && (
                      <span className="text-sm text-[hsl(210,40%,98%)/0.5]">{plan.priceNote}</span>
                    )}
                  </div>
                  <p className="text-sm text-[hsl(210,40%,98%)/0.5]">{plan.subtitle}</p>
                </div>

                {/* Features */}
                <div className="flex-1 mb-6">
                  <ul className="space-y-2.5">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: plan.color }} />
                        <span className="text-[hsl(210,40%,98%)/0.75]">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                {plan.name === "Free" ? (
                  <Link to="/auth" className="w-full">
                    <Button
                      className="w-full bg-[hsl(142,76%,36%)] text-white font-semibold hover:bg-[hsl(142,76%,42%)] border-none text-xs sm:text-sm h-auto py-2.5 whitespace-normal"
                    >
                      <span className="truncate">{plan.cta}</span>
                      <ArrowRight className="h-4 w-4 ml-1 shrink-0" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => openQualification(plan.name.toLowerCase())}
                    className={`w-full font-semibold border-none text-xs sm:text-sm h-auto py-2.5 whitespace-normal ${
                      plan.highlighted
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.9)]"
                        : plan.name === "Business"
                          ? "bg-[hsl(221,83%,53%)] text-white hover:bg-[hsl(221,83%,60%)]"
                          : "bg-[hsl(38,92%,50%)] text-[hsl(0,0%,10%)] hover:bg-[hsl(38,92%,58%)]"
                    }`}
                  >
                    <span className="truncate">{plan.cta}</span>
                    <ArrowRight className="h-4 w-4 ml-1 shrink-0" />
                  </Button>
                )}

                {plan.note && (
                  <p className="text-[10px] text-[hsl(210,40%,98%)/0.35] mt-3 text-center">{plan.note}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Strategic Explanation */}
      <div className="max-w-3xl mx-auto px-6 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-[hsl(210,40%,98%)/0.08] bg-[hsl(210,40%,98%)/0.02] p-8 md:p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <Puzzle className="h-5 w-5 text-[hsl(var(--primary))]" />
            <h4 className="text-lg font-bold text-[hsl(210,40%,98%)]">
              Porque não publicamos todos os valores?
            </h4>
          </div>
          <p className="text-sm text-[hsl(210,40%,98%)/0.6] mb-5">Cada empresa tem:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
            {strategicReasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-1 h-1 rounded-full bg-[hsl(var(--primary))]" />
                <span className="text-sm text-[hsl(210,40%,98%)/0.7]">{r}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[hsl(210,40%,98%)/0.08] pt-5">
            <p className="text-sm text-[hsl(210,40%,98%)/0.7]">
              <span className="font-semibold text-[hsl(var(--primary))]">O FastCRM é modular.</span>{" "}
              Desenhamos a arquitetura ajustada à sua operação.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Micro Copy */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-center px-6"
      >
        <p className="text-sm text-[hsl(210,40%,98%)/0.4] max-w-lg mx-auto leading-relaxed">
          Não vendemos apenas um CRM.{" "}
          <span className="text-[hsl(210,40%,98%)/0.7] font-medium">
            Desenhamos a infraestrutura digital da sua empresa.
          </span>
        </p>
      </motion.div>
    </section>
  );
}
