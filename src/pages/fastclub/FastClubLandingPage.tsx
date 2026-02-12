import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  ChevronRight,
  ClipboardList,
  Gauge,
  Layers,
  Link2,
  Network,
  Search,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

const PROBLEMS = [
  { icon: Search, label: "Métodos avulsos sem estrutura" },
  { icon: Layers, label: "Ferramentas desligadas do processo" },
  { icon: Users, label: "Networking sem retorno mensurável" },
  { icon: BarChart3, label: "Formação sem aplicação prática" },
];

const SOLUTIONS = [
  {
    icon: ClipboardList,
    title: "Método PARE",
    subtitle: "Framework de execução.",
    description: "Planeamento, Automação, Resultados e Eficiência aplicados ao ciclo comercial.",
  },
  {
    icon: Brain,
    title: "Conteúdo Guiado",
    subtitle: "Educação com propósito.",
    description: "Playbooks, templates e missões semanais com impacto direto na operação.",
  },
  {
    icon: Network,
    title: "Rede Privada",
    subtitle: "Oportunidades qualificadas.",
    description: "Matching estratégico entre membros verificados com integração CRM.",
  },
];

const PARE_PHASES = [
  {
    icon: Target,
    title: "Planeamento",
    description: "Definição de ICP, segmentação e estratégia de abordagem antes da ação.",
    gradient: "from-blue-500 to-sky-400",
  },
  {
    icon: Zap,
    title: "Automação",
    description: "Follow-ups, qualificação e movimentação de leads sem intervenção manual.",
    gradient: "from-amber-500 to-orange-400",
  },
  {
    icon: BarChart3,
    title: "Resultados",
    description: "Dashboards, KPIs e relatórios que mostram o impacto real das ações.",
    gradient: "from-emerald-500 to-green-400",
  },
  {
    icon: Gauge,
    title: "Eficiência",
    description: "IA aplicada, templates reutilizáveis e processos que multiplicam capacidade.",
    gradient: "from-violet-500 to-purple-400",
  },
];

const CASE_STUDIES = [
  {
    context: "Consultor comercial a trabalhar sozinho, sem método de prospeção estruturado.",
    action: "Implementação do Método PARE com pipeline de 5 etapas e automação de follow-up via FastCRM.",
    result: "Taxa de resposta subiu de 8% para 31% em 4 semanas. Pipeline organizado e previsível.",
  },
  {
    context: "Equipa de vendas de 5 pessoas com formação teórica mas sem ferramentas de execução.",
    action: "Adoção dos playbooks guiados e missões semanais do FastClub para toda a equipa.",
    result: "Tempo médio de fecho reduziu 40%. Consistência entre comerciais aumentou significativamente.",
  },
  {
    context: "PME de serviços B2B sem canal de distribuição para novos mercados.",
    action: "Ativação da Rede Privada com match a parceiro estratégico com carteira complementar.",
    result: "Acordo de parceria em 3 semanas. 8 novos clientes nos primeiros 60 dias.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "0",
    matches: "3 matches/mês",
    features: [
      "Acesso ao Método PARE",
      "Conteúdos da zona pública",
      "Rede Privada — acesso limitado",
      "Comunidade FastClub",
    ],
  },
  {
    name: "Premium",
    price: "49",
    matches: "25 matches/mês",
    popular: true,
    features: [
      "Tudo do plano Free",
      "Zona Premium completa",
      "Missões semanais",
      "Rede Privada — acesso completo",
      "Deep-links prioritários ao CRM",
    ],
  },
  {
    name: "Verificado",
    price: "99",
    matches: "Matches ilimitados",
    features: [
      "Tudo do plano Premium",
      "Selo de membro verificado",
      "Prioridade no matching",
      "Acesso antecipado a funcionalidades",
      "Suporte dedicado",
    ],
  },
];

export default function FastClubLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const canonicalUrl = `${getPublicBaseUrl()}/fastclub`;

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>FastClub — Centro Estratégico do Ecossistema FastCRM</title>
        <meta name="description" content="Método PARE, conteúdos guiados e rede privada de oportunidades. O FastClub é o centro de execução e crescimento do ecossistema FastCRM." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="FastClub — Centro Estratégico do Ecossistema FastCRM" />
        <meta property="og:description" content="Método de vendas, conteúdos práticos e rede privada de oportunidades num só ecossistema." />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Header */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"}`}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/fastclub" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className={`font-bold text-lg ${scrolled ? "text-foreground" : "text-primary-foreground"}`}>
              FastClub
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: "Método PARE", href: "#metodo-pare" },
              { label: "Rede Privada", href: "#rede" },
              { label: "Planos", href: "#planos" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${scrolled ? "text-muted-foreground hover:text-foreground" : "text-primary-foreground/70 hover:text-primary-foreground"}`}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className={scrolled ? "" : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"}>
              <Link to="/auth?redirect=/club/fastclub">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth?redirect=/club/fastclub">Começar Agora</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* 1. HERO — Atenção */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/80 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative container mx-auto px-4 pt-32 pb-24 md:pt-40 md:pb-32">
          <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground tracking-tight leading-tight">
              O Centro Estratégico do Ecossistema FastCRM.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto">
              Método de execução comercial, conteúdos guiados e uma rede privada de oportunidades.
              Tudo estruturado para gerar resultados reais.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" variant="secondary" asChild className="gap-2 text-base font-semibold px-8">
                <Link to="/auth?redirect=/club/fastclub">
                  Aceder ao FastClub
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                <a href="#ecossistema">Explorar o Ecossistema</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. PROBLEMA — Interesse */}
      <section className="border-t border-border">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A maioria dos profissionais investe em ferramentas, mas não em método.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {PROBLEMS.map((item, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: 0.05 + i * 0.08, duration: 0.5 }}>
                <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-destructive/70" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.p {...fadeUp} transition={{ delay: 0.4, duration: 0.5 }} className="mt-12 text-center text-lg text-muted-foreground max-w-xl mx-auto">
            O resultado é esforço sem retorno e crescimento limitado.
          </motion.p>
        </div>
      </section>

      {/* 3. SOLUÇÃO — Interesse */}
      <section id="ecossistema" className="bg-muted/20 border-t border-border">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Um ecossistema estruturado para execução.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {SOLUTIONS.map((item, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}>
                <Card className="h-full group border-border/50 bg-card hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm font-medium text-foreground/70 mb-2">{item.subtitle}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} transition={{ delay: 0.4, duration: 0.5 }} className="mt-12 text-center">
            <a href="#metodo-pare">
              <Button variant="outline" size="lg" className="gap-2">
                Ver como funciona
                <ChevronRight className="h-4 w-4" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* 4. MÉTODO PARE — Desejo */}
      <section id="metodo-pare" className="border-t border-border">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Método PARE
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Quatro fases de execução comercial, da estratégia à otimização contínua.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {PARE_PHASES.map((phase, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}>
                <Card className="h-full border-border/50 overflow-hidden">
                  <div className={`h-1.5 bg-gradient-to-r ${phase.gradient}`} />
                  <CardContent className="p-6 space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <phase.icon className="h-5 w-5 text-foreground/70" />
                    </div>
                    <h3 className="font-semibold text-foreground">{phase.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{phase.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. REDE E COMUNIDADE — Desejo */}
      <section id="rede" className="border-t border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                Rede Privada de Oportunidades
              </h2>
              <p className="text-lg text-muted-foreground mb-4 max-w-2xl">
                Membros verificados conectam-se através de matching estratégico. Cada oportunidade
                integra automaticamente o CRM, criando pipeline real.
              </p>
              <p className="text-base text-muted-foreground mb-12 max-w-2xl">
                A quota de matches é ajustada por plano. O acesso à rede é exclusivo para membros do ecossistema.
              </p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {[
                { value: "84", label: "oportunidades geradas esta semana" },
                { value: "12", label: "novos membros verificados" },
                { value: "86%", label: "taxa média de resposta" },
              ].map((stat, i) => (
                <motion.div key={i} {...fadeUp} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}>
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
                    <p className="text-4xl font-bold text-foreground mb-2">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div {...fadeUp} transition={{ delay: 0.4, duration: 0.5 }}>
              <Link to="/auth?redirect=/club/fastclub">
                <Button variant="outline" size="lg" className="gap-2">
                  Explorar a Rede Privada
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. PROVA SOCIAL — Desejo */}
      <section className="border-t border-border bg-muted/20">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Resultados Reais</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {CASE_STUDIES.map((item, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}>
                <Card className="h-full border-border/50 bg-card">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Contexto</p>
                      <p className="text-sm text-foreground/80">{item.context}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Ação</p>
                      <p className="text-sm text-foreground/80">{item.action}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Resultado</p>
                      <p className="text-sm font-medium text-foreground">{item.result}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PLANOS — Ação */}
      <section id="planos" className="border-t border-border">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Escolha o acesso certo para o seu momento.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}>
                <Card className={`h-full border-border/50 bg-card relative ${plan.popular ? "border-primary/50 shadow-lg" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                        Mais popular
                      </span>
                    </div>
                  )}
                  <CardContent className="p-8">
                    <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{plan.matches}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-bold">{plan.price}€</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/auth?redirect=/club/fastclub">
                      <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                        Começar
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. ENCERRAMENTO — Ação */}
      <section className="border-t border-border bg-gradient-to-b from-muted/30 to-muted/10">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-8">
              Construa resultados com método.{" "}
              <span className="text-muted-foreground">Não com improviso.</span>
            </h2>
            <div className="space-y-2 mb-10">
              <p className="text-lg text-muted-foreground">Aprenda a executar com estrutura.</p>
              <p className="text-lg text-muted-foreground">Conecte-se a oportunidades reais.</p>
              <p className="text-lg text-muted-foreground">Cresça dentro de um ecossistema integrado.</p>
            </div>
            <Link to="/auth?redirect=/club/fastclub">
              <Button size="lg" className="h-12 px-8 text-base gap-2">
                Aceder ao FastClub
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Zap className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">FastClub</span>
              <span className="text-muted-foreground/60 mx-1">|</span>
              <Link to="/" className="hover:text-foreground transition-colors">FastCRM</Link>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/club/fastclub" className="hover:text-foreground transition-colors">Comunidade</Link>
              <Link to="/auth" className="hover:text-foreground transition-colors">Login</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Termos</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
