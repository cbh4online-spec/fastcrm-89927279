import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureStatus = true | false | "partial";

interface CompetitorData {
  name: string;
  logo: string;
  features: Record<string, FeatureStatus>;
}

const categories = [
  {
    name: "CRM & Pipeline",
    features: [
      "Pipeline visual drag & drop",
      "Objetos e campos personalizados",
      "Múltiplos pipelines",
      "Vistas e filtros guardados",
      "Importação/exportação CSV",
      "Gestão de contactos ilimitados",
    ],
  },
  {
    name: "Inteligência & Automação",
    features: [
      "Health score por negócio",
      "Deal intelligence integrada",
      "Automações nativas (sem add-on)",
      "AI Copilot integrado",
      "Alertas proativos de risco",
      "Análise win/loss automática",
    ],
  },
  {
    name: "Marketing & Crescimento",
    features: [
      "Landing pages integradas",
      "Funis de conversão nativos",
      "Formulários web integrados",
      "Email marketing básico",
      "Tracking de UTMs",
      "Lead scoring automático",
    ],
  },
  {
    name: "Preço & Acessibilidade",
    features: [
      "Plano gratuito funcional",
      "Sem custos por contacto",
      "Sem limites de automações",
      "Setup em menos de 5 minutos",
      "Suporte em Português",
      "RGPD compliance nativo",
    ],
  },
];

const fastcrm: Record<string, FeatureStatus> = {
  "Pipeline visual drag & drop": true,
  "Objetos e campos personalizados": true,
  "Múltiplos pipelines": true,
  "Vistas e filtros guardados": true,
  "Importação/exportação CSV": true,
  "Gestão de contactos ilimitados": true,
  "Health score por negócio": true,
  "Deal intelligence integrada": true,
  "Automações nativas (sem add-on)": true,
  "AI Copilot integrado": true,
  "Alertas proativos de risco": true,
  "Análise win/loss automática": true,
  "Landing pages integradas": true,
  "Funis de conversão nativos": true,
  "Formulários web integrados": true,
  "Email marketing básico": true,
  "Tracking de UTMs": true,
  "Lead scoring automático": true,
  "Plano gratuito funcional": true,
  "Sem custos por contacto": true,
  "Sem limites de automações": true,
  "Setup em menos de 5 minutos": true,
  "Suporte em Português": true,
  "RGPD compliance nativo": true,
};

const competitors: CompetitorData[] = [
  {
    name: "HubSpot",
    logo: "H",
    features: {
      "Pipeline visual drag & drop": true,
      "Objetos e campos personalizados": "partial",
      "Múltiplos pipelines": "partial",
      "Vistas e filtros guardados": true,
      "Importação/exportação CSV": true,
      "Gestão de contactos ilimitados": false,
      "Health score por negócio": "partial",
      "Deal intelligence integrada": "partial",
      "Automações nativas (sem add-on)": false,
      "AI Copilot integrado": "partial",
      "Alertas proativos de risco": false,
      "Análise win/loss automática": false,
      "Landing pages integradas": "partial",
      "Funis de conversão nativos": false,
      "Formulários web integrados": true,
      "Email marketing básico": true,
      "Tracking de UTMs": true,
      "Lead scoring automático": false,
      "Plano gratuito funcional": "partial",
      "Sem custos por contacto": false,
      "Sem limites de automações": false,
      "Setup em menos de 5 minutos": "partial",
      "Suporte em Português": false,
      "RGPD compliance nativo": "partial",
    },
  },
  {
    name: "Zoho CRM",
    logo: "Z",
    features: {
      "Pipeline visual drag & drop": true,
      "Objetos e campos personalizados": true,
      "Múltiplos pipelines": true,
      "Vistas e filtros guardados": true,
      "Importação/exportação CSV": true,
      "Gestão de contactos ilimitados": false,
      "Health score por negócio": false,
      "Deal intelligence integrada": "partial",
      "Automações nativas (sem add-on)": "partial",
      "AI Copilot integrado": "partial",
      "Alertas proativos de risco": false,
      "Análise win/loss automática": false,
      "Landing pages integradas": false,
      "Funis de conversão nativos": false,
      "Formulários web integrados": true,
      "Email marketing básico": "partial",
      "Tracking de UTMs": "partial",
      "Lead scoring automático": "partial",
      "Plano gratuito funcional": "partial",
      "Sem custos por contacto": false,
      "Sem limites de automações": false,
      "Setup em menos de 5 minutos": false,
      "Suporte em Português": false,
      "RGPD compliance nativo": "partial",
    },
  },
  {
    name: "Pipedrive",
    logo: "P",
    features: {
      "Pipeline visual drag & drop": true,
      "Objetos e campos personalizados": true,
      "Múltiplos pipelines": true,
      "Vistas e filtros guardados": true,
      "Importação/exportação CSV": true,
      "Gestão de contactos ilimitados": true,
      "Health score por negócio": false,
      "Deal intelligence integrada": false,
      "Automações nativas (sem add-on)": "partial",
      "AI Copilot integrado": "partial",
      "Alertas proativos de risco": false,
      "Análise win/loss automática": false,
      "Landing pages integradas": false,
      "Funis de conversão nativos": false,
      "Formulários web integrados": "partial",
      "Email marketing básico": "partial",
      "Tracking de UTMs": false,
      "Lead scoring automático": false,
      "Plano gratuito funcional": false,
      "Sem custos por contacto": true,
      "Sem limites de automações": false,
      "Setup em menos de 5 minutos": true,
      "Suporte em Português": false,
      "RGPD compliance nativo": true,
    },
  },
  {
    name: "Salesforce",
    logo: "S",
    features: {
      "Pipeline visual drag & drop": true,
      "Objetos e campos personalizados": true,
      "Múltiplos pipelines": true,
      "Vistas e filtros guardados": true,
      "Importação/exportação CSV": true,
      "Gestão de contactos ilimitados": true,
      "Health score por negócio": "partial",
      "Deal intelligence integrada": "partial",
      "Automações nativas (sem add-on)": "partial",
      "AI Copilot integrado": "partial",
      "Alertas proativos de risco": "partial",
      "Análise win/loss automática": "partial",
      "Landing pages integradas": false,
      "Funis de conversão nativos": false,
      "Formulários web integrados": "partial",
      "Email marketing básico": "partial",
      "Tracking de UTMs": "partial",
      "Lead scoring automático": "partial",
      "Plano gratuito funcional": false,
      "Sem custos por contacto": false,
      "Sem limites de automações": false,
      "Setup em menos de 5 minutos": false,
      "Suporte em Português": false,
      "RGPD compliance nativo": "partial",
    },
  },
];

function StatusIcon({ status }: { status: FeatureStatus }) {
  if (status === true)
    return (
      <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
        <Check className="h-4 w-4 text-emerald-400" />
      </div>
    );
  if (status === "partial")
    return (
      <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center">
        <Minus className="h-4 w-4 text-amber-400" />
      </div>
    );
  return (
    <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
      <X className="h-4 w-4 text-red-400/70" />
    </div>
  );
}

export function LandingDetailedComparison() {
  const [selectedCompetitor, setSelectedCompetitor] = useState(0);
  const competitor = competitors[selectedCompetitor];

  return (
    <section className="relative py-28 lg:py-36 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4 block">
            Comparação Detalhada
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-5">
            FastCRM vs{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
              Concorrência
            </span>
          </h2>
          <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
            Compare funcionalidade por funcionalidade. Sem truques, sem letras pequenas.
          </p>
        </motion.div>

        {/* Competitor Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10"
        >
          {competitors.map((c, i) => (
            <button
              key={c.name}
              onClick={() => setSelectedCompetitor(i)}
              className={cn(
                "px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wide transition-all duration-300 border",
                i === selectedCompetitor
                  ? "bg-primary/15 border-primary/50 text-primary shadow-lg shadow-primary/10"
                  : "bg-[hsl(222,47%,6%)] border-[hsl(217,33%,17%)] text-[hsl(215,20%,55%)] hover:border-[hsl(215,20%,35%)] hover:text-[hsl(215,20%,75%)]"
              )}
            >
              <span className="hidden sm:inline">FastCRM vs </span>{c.name}
            </button>
          ))}
        </motion.div>

        {/* Comparison Table */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCompetitor}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] overflow-hidden"
          >
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_100px_100px] md:grid-cols-[1fr_140px_140px] border-b border-[hsl(217,33%,17%)] bg-[hsl(222,47%,8%)]">
              <div className="p-4 sm:p-5 text-xs font-bold uppercase tracking-wider text-[hsl(215,20%,45%)]">
                Funcionalidade
              </div>
              <div className="p-4 sm:p-5 text-center">
                <span className="text-sm font-black uppercase tracking-wide text-primary">
                  Fast<span className="text-[hsl(210,40%,98%)]">CRM</span>
                </span>
              </div>
              <div className="p-4 sm:p-5 text-center">
                <span className="text-sm font-bold uppercase tracking-wide text-[hsl(215,20%,65%)]">
                  {competitor.name}
                </span>
              </div>
            </div>

            {/* Categories */}
            {categories.map((cat, ci) => (
              <div key={cat.name}>
                {/* Category Header */}
                <div className="px-4 sm:px-5 py-3 bg-[hsl(222,47%,7%)] border-b border-[hsl(217,33%,15%)]">
                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary/80">
                    {cat.name}
                  </span>
                </div>
                {/* Features */}
                {cat.features.map((feat, fi) => (
                  <div
                    key={feat}
                    className={cn(
                      "grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_100px_100px] md:grid-cols-[1fr_140px_140px] items-center",
                      fi < cat.features.length - 1 || ci < categories.length - 1
                        ? "border-b border-[hsl(217,33%,12%)]"
                        : "",
                      "hover:bg-[hsl(222,47%,7%)] transition-colors"
                    )}
                  >
                    <div className="p-3 sm:p-4 text-xs sm:text-sm text-[hsl(215,20%,70%)]">
                      {feat}
                    </div>
                    <div className="p-3 sm:p-4 flex justify-center">
                      <StatusIcon status={fastcrm[feat]} />
                    </div>
                    <div className="p-3 sm:p-4 flex justify-center">
                      <StatusIcon status={competitor.features[feat]} />
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Summary Footer */}
            <div className="grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_100px_100px] md:grid-cols-[1fr_140px_140px] border-t border-[hsl(217,33%,17%)] bg-[hsl(222,47%,8%)]">
              <div className="p-4 sm:p-5 text-sm font-bold text-[hsl(210,40%,98%)]">
                Total ✓
              </div>
              <div className="p-4 sm:p-5 flex justify-center">
                <span className="text-lg font-black text-emerald-400">
                  {Object.values(fastcrm).filter((v) => v === true).length}/{Object.keys(fastcrm).length}
                </span>
              </div>
              <div className="p-4 sm:p-5 flex justify-center">
                <span className="text-lg font-black text-[hsl(215,20%,55%)]">
                  {Object.values(competitor.features).filter((v) => v === true).length}/{Object.keys(competitor.features).length}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mt-6 text-xs text-[hsl(215,20%,55%)]">
          <span className="inline-flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="h-3 w-3 text-emerald-400" />
            </div>
            Incluído
          </span>
          <span className="inline-flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Minus className="h-3 w-3 text-amber-400" />
            </div>
            Parcial / Pago
          </span>
          <span className="inline-flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center">
              <X className="h-3 w-3 text-red-400/70" />
            </div>
            Não disponível
          </span>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center mt-10"
        >
          <a
            href="#hero-form"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-primary shadow-glow text-primary-foreground font-bold uppercase tracking-wide text-sm hover:opacity-90 transition-opacity"
          >
            Experimentar FastCRM Grátis
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
