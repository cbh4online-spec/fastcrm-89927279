import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, LayoutDashboard, MessageSquare, Brain, BarChart3 } from "lucide-react";
import pricingBg from "@/assets/pricing-bg.jpg";

export function LandingHeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Futuristic background image */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `url(${pricingBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,20%,4%)/0.5] via-transparent to-[hsl(220,20%,4%)] pointer-events-none" />

      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[hsl(250,83%,60%)]/10 blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-sm text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Plataforma SaaS Empresarial
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold leading-[1.15] tracking-tight">
              <span className="block">Não é apenas um CRM.</span>
              <span className="block bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
                É a Infraestrutura Digital
              </span>
              <span className="block">da Sua Empresa.</span>
            </h1>

            <p className="text-lg text-[hsl(215,20%,65%)] max-w-xl leading-relaxed">
              O FastCRM integra CRM, IA, automação, comunicação omnicanal, marketplace de módulos e gestão multi-workspace numa única plataforma SaaS empresarial.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="gradient-primary shadow-glow text-primary-foreground px-8 h-12 text-base font-semibold gap-2"
                >
                  Criar Workspace Gratuito
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#solucao">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[hsl(217,33%,17%)] bg-transparent text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] px-8 h-12 text-base gap-2"
                >
                  <Play className="h-4 w-4" />
                  Ver Demonstração
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Right — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-2xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-1 shadow-2xl">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(217,33%,17%)]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[hsl(0,84%,60%)]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(38,92%,50%)]" />
                  <div className="w-3 h-3 rounded-full bg-[hsl(142,76%,36%)]" />
                </div>
                <span className="text-xs text-[hsl(215,20%,65%)] ml-2">FastCRM — Dashboard</span>
              </div>

              {/* Mock dashboard content */}
              <div className="p-6 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Leads Activos", value: "847", icon: LayoutDashboard },
                    { label: "Inbox", value: "23", icon: MessageSquare },
                    { label: "IA Insights", value: "12", icon: Brain },
                    { label: "Conversão", value: "34%", icon: BarChart3 },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,8%)] p-3"
                    >
                      <stat.icon className="h-4 w-4 text-primary mb-1" />
                      <div className="text-lg font-bold">{stat.value}</div>
                      <div className="text-[10px] text-[hsl(215,20%,65%)]">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Pipeline mockup */}
                <div className="rounded-lg border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,8%)] p-4">
                  <div className="text-xs font-semibold text-[hsl(215,20%,65%)] mb-3">Pipeline de Vendas</div>
                  <div className="flex gap-2">
                    {["Novo", "Qualificado", "Proposta", "Fecho"].map((stage, i) => (
                      <div key={stage} className="flex-1">
                        <div className="text-[10px] text-[hsl(215,20%,65%)] mb-1">{stage}</div>
                        <div
                          className="h-2 rounded-full"
                          style={{
                            background: `hsl(221, 83%, ${53 + i * 8}%)`,
                            width: `${100 - i * 15}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI suggestion mockup */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
                  <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-primary mb-0.5">Sugestão IA</div>
                    <div className="text-[11px] text-[hsl(215,20%,65%)]">
                      O lead "Clínica Saúde+" tem 87% de probabilidade de conversão. Recomendo follow-up hoje.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effect behind */}
            <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
