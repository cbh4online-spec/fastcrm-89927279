import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, BarChart3, Bot, CheckCircle2, Handshake, Layers, Lightbulb,
  Rocket, Shield, Target, TrendingUp, Users, Zap,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

const PILLARS = [
  {
    icon: BarChart3,
    title: "FastCRM",
    description: "CRM inteligente com pipeline visual, automações e IA integrada para converter mais com menos esforço.",
  },
  {
    icon: Target,
    title: "Método PARE",
    description: "Framework de aceleração comercial em 4 fases: Preparar, Ativar, Refinar e Escalar.",
  },
  {
    icon: Users,
    title: "Rede Privada",
    description: "Comunidade exclusiva de profissionais verificados para networking estratégico e partilha de oportunidades.",
  },
];

const STEPS = [
  { icon: Rocket, title: "Registe-se", description: "Crie a sua conta e aceda ao ecossistema gratuitamente." },
  { icon: Layers, title: "Explore", description: "Descubra o Método PARE e as ferramentas do FastCRM." },
  { icon: Zap, title: "Implemente", description: "Siga o Desafio 7 Dias para ativar o seu CRM." },
  { icon: TrendingUp, title: "Escale", description: "Desbloqueie funcionalidades premium e acelere resultados." },
];

const BENEFITS = [
  { icon: Bot, title: "IA Comercial", description: "Automações e prompts inteligentes para cada etapa do funil." },
  { icon: Shield, title: "Dados Seguros", description: "Infraestrutura robusta com controlo de acesso por workspace." },
  { icon: Handshake, title: "FastMatch Hub", description: "Rede de oportunidades entre membros verificados." },
  { icon: Lightbulb, title: "Playbooks Guiados", description: "Implementação passo a passo com resultados mensuráveis." },
  { icon: BarChart3, title: "Métricas em Tempo Real", description: "Dashboards e KPIs que orientam decisões comerciais." },
  { icon: CheckCircle2, title: "Suporte Premium", description: "Acesso direto a especialistas e comunidade ativa." },
];

const TESTIMONIALS = [
  {
    quote: "O FastCRM transformou a forma como gerimos o nosso pipeline. Em 30 dias duplicámos as conversões.",
    author: "Ana R.",
    role: "Diretora Comercial",
  },
  {
    quote: "O Método PARE deu-nos uma estrutura clara. Toda a equipa fala a mesma linguagem agora.",
    author: "Pedro S.",
    role: "CEO, PME Tecnológica",
  },
  {
    quote: "O FastMatch Hub foi um game-changer. Encontrámos 3 parceiros estratégicos no primeiro mês.",
    author: "Mariana L.",
    role: "Business Development",
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
        <title>FastClub - Ecossistema de Aceleração Comercial</title>
        <meta name="description" content="Acelere as suas vendas com o FastClub: CRM inteligente, Método PARE e uma rede privada de oportunidades. Comece gratuitamente." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="FastClub - Ecossistema de Aceleração Comercial" />
        <meta property="og:description" content="CRM inteligente, metodologia de vendas e rede privada. Tudo num só ecossistema." />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Navbar */}
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className={scrolled ? "" : "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"}>
              <Link to="/auth?redirect=/dashboard/fastclub">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup?redirect=/dashboard/fastclub">Começar Grátis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary via-primary to-primary/80 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative container mx-auto px-4 pt-32 pb-20 md:pt-40 md:pb-28">
          <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto text-center space-y-6">
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 text-sm px-4 py-1.5">
              Ecossistema de Aceleração Comercial
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground tracking-tight leading-tight">
              Venda mais. <br className="hidden sm:block" />
              Com método e tecnologia.
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto">
              O FastClub combina um CRM inteligente, uma metodologia de vendas comprovada e uma rede privada de oportunidades — tudo num só ecossistema.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" variant="secondary" asChild className="gap-2 text-base font-semibold px-8">
                <Link to="/signup?redirect=/dashboard/fastclub">
                  Começar Gratuitamente
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                <Link to="/club/fastclub">
                  Ver Comunidade
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pilares do Ecossistema */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              O Ecossistema FastClub
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Três pilares integrados para acelerar o seu desempenho comercial.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PILLARS.map((pillar, i) => (
              <motion.div key={pillar.title} {...fadeUp} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}>
                <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 border-border/50">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <pillar.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{pillar.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{pillar.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Como Funciona
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Quatro passos para transformar a sua operação comercial.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {STEPS.map((step, i) => (
              <motion.div key={step.title} {...fadeUp} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}>
                <div className="text-center space-y-4">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-7 h-7 text-primary" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Tudo o que precisa, num só lugar
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {BENEFITS.map((b, i) => (
              <motion.div key={b.title} {...fadeUp} transition={{ delay: 0.05 + i * 0.06, duration: 0.5 }}>
                <Card className="h-full transition-all hover:shadow-md border-border/50">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
                      <b.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{b.title}</h4>
                      <p className="text-sm text-muted-foreground">{b.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testemunhos */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              O que dizem os nossos membros
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}>
                <Card className="h-full border-border/50">
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <p className="text-foreground italic leading-relaxed mb-6">"{t.quote}"</p>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="relative container mx-auto px-4">
          <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground">
              Pronto para acelerar?
            </h2>
            <p className="text-lg text-primary-foreground/70">
              Junte-se a centenas de profissionais que já estão a transformar os seus resultados comerciais com o FastClub.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button size="lg" variant="secondary" asChild className="gap-2 text-base font-semibold px-8">
                <Link to="/signup?redirect=/dashboard/fastclub">
                  Criar Conta Gratuita
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/auth?redirect=/dashboard/fastclub">Já tenho conta</Link>
              </Button>
            </div>
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
