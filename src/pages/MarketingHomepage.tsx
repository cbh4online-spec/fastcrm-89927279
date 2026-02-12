import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  TrendingUp,
  Users,
  Zap,
  Target,
  BarChart3,
  ArrowRight,
  Network,
  Shield,
  Eye,
  Layers,
  Check,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function MarketingHomepage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">FastCRM</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#ecossistema" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Ecossistema
              </a>
              <a href="#fastclub" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FastClub
              </a>
              <a href="#rede" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Rede Privada
              </a>
              <a href="#planos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Planos
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">
                Começar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO — Atenção */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative py-28 md:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Infraestrutura Digital para{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Empresas Modernas
              </span>
            </h1>
            <p className="mt-6 text-xl font-medium text-foreground/80">
              Organize. Automatize. Conecte.
            </p>
            <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
              CRM, Inteligência Artificial e Rede Privada integrados numa única plataforma.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="h-12 px-8 text-base">
                  Começar Agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#ecossistema">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  Explorar o Ecossistema
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROBLEMA — Interesse */}
      <section className="border-t border-border">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A maioria das empresas opera com sistemas fragmentados.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {[
              { icon: Layers, label: "Ferramentas isoladas" },
              { icon: Eye, label: "Dados dispersos" },
              { icon: Zap, label: "Processos manuais" },
              { icon: BarChart3, label: "Falta de visibilidade" },
              { icon: TrendingUp, label: "Pouca previsibilidade" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-6 text-center"
              >
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-destructive/70" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-12 text-center text-lg text-muted-foreground max-w-xl mx-auto">
            O resultado é ineficiência e crescimento limitado.
          </p>
        </div>
      </section>

      {/* 3. SOLUÇÃO — Interesse */}
      <section id="ecossistema" className="bg-muted/20 border-t border-border">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Uma infraestrutura integrada.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Target,
                title: "CRM",
                subtitle: "Estrutura operacional.",
                description: "Leads, pipeline, controlo e métricas.",
              },
              {
                icon: Brain,
                title: "IA",
                subtitle: "Automação inteligente.",
                description: "Sugestões estratégicas. Assistentes integrados.",
              },
              {
                icon: Network,
                title: "Rede Privada",
                subtitle: "Oportunidades qualificadas.",
                description: "Matching estratégico. Reputação e métricas de ROI.",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className="group border-border/50 bg-card hover:border-primary/30 transition-all duration-300"
              >
                <CardContent className="p-8">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm font-medium text-foreground/70 mb-2">{item.subtitle}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/auth">
              <Button variant="outline" size="lg" className="gap-2">
                Ver como funciona
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. FASTCLUB — Desejo */}
      <section id="fastclub" className="border-t border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              O ecossistema não termina no software.
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              O FastClub é o centro estratégico do FastCRM. Um ambiente onde membros aprendem a
              implementar o Método PARE, otimizar a presença na Rede Privada e gerar resultados
              reais.
            </p>
            <p className="text-base font-medium text-foreground/80 mb-10">
              Não é um grupo informal. É um espaço estruturado para execução e crescimento.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/club/fastclub">
                <Button size="lg" className="gap-2">
                  Aceder ao FastClub
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/fastclub">
                <Button size="lg" variant="outline" className="gap-2">
                  Explorar o FastClub
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. REDE PRIVADA — Desejo */}
      <section id="rede" className="border-t border-border">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Rede Privada de Oportunidades
            </h2>
            <p className="text-lg text-muted-foreground mb-4 max-w-2xl">
              Todos os membros verificados podem conectar-se. A diferença está na quota de matches
              mensais, ajustada por plano.
            </p>
            <p className="text-base text-muted-foreground mb-12 max-w-2xl">
              O sistema integra automaticamente oportunidades no CRM, criando pipeline real.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              {[
                { value: "84", label: "oportunidades geradas esta semana" },
                { value: "12", label: "novos membros verificados" },
                { value: "86%", label: "taxa média de resposta" },
              ].map((stat, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
                  <p className="text-4xl font-bold text-foreground mb-2">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="gap-2">
                Explorar a Rede Privada
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. PROVA SOCIAL — Desejo */}
      <section className="border-t border-border bg-muted/20">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Resultados Reais</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                context:
                  "Empresa de consultoria B2B com 3 comerciais, sem processo estruturado de follow-up.",
                action:
                  "Implementação de pipeline com 5 etapas e automação de follow-up a 48h via FastCRM.",
                result:
                  "Taxa de resposta aumentou de 12% para 34% no primeiro mês. Pipeline organizado e previsível.",
              },
              {
                context:
                  "Agência digital com ciclo de venda longo e propostas manuais que consumiam horas.",
                action:
                  "Propostas geradas por IA com personalização automática baseada no briefing do lead.",
                result:
                  "Tempo de criação de proposta reduziu de 2h para 8 minutos. Mais propostas enviadas, mais negócios fechados.",
              },
              {
                context:
                  "Startup SaaS sem canal de distribuição B2B para o mercado português.",
                action:
                  "Ativação da Rede Privada com match a distribuidor com carteira de 200+ PMEs.",
                result:
                  "Acordo de distribuição assinado em 3 semanas. 12 clientes nos primeiros 90 dias.",
              },
            ].map((item, i) => (
              <Card key={i} className="border-border/50 bg-card">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Contexto
                    </p>
                    <p className="text-sm text-foreground/80">{item.context}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Ação
                    </p>
                    <p className="text-sm text-foreground/80">{item.action}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                      Resultado
                    </p>
                    <p className="text-sm font-medium text-foreground">{item.result}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PLANOS — Ação */}
      <section id="planos" className="border-t border-border">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Escolha a infraestrutura certa para o seu negócio.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "29",
                matches: "10 matches/mês",
                features: [
                  "CRM completo",
                  "IA — funcionalidades base",
                  "Acesso ao FastClub",
                  "Rede Privada — acesso limitado",
                ],
              },
              {
                name: "Professional",
                price: "79",
                matches: "50 matches/mês",
                popular: true,
                features: [
                  "CRM completo",
                  "IA — funcionalidades avançadas",
                  "Acesso ao FastClub",
                  "Rede Privada — acesso completo",
                  "Relatórios de ROI",
                ],
              },
              {
                name: "Enterprise",
                price: "149",
                matches: "Matches ilimitados",
                features: [
                  "CRM completo",
                  "IA — sem limites",
                  "Acesso ao FastClub",
                  "Rede Privada — prioridade",
                  "Gestor de conta dedicado",
                  "API e integrações",
                ],
              },
            ].map((plan, i) => (
              <Card
                key={i}
                className={`border-border/50 bg-card relative ${
                  plan.popular ? "border-primary/50 shadow-lg" : ""
                }`}
              >
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
                  <Link to="/auth">
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      Começar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 8. ENCERRAMENTO — Ação */}
      <section className="border-t border-border bg-gradient-to-b from-muted/30 to-muted/10">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-8">
              Construa sobre infraestrutura.{" "}
              <span className="text-muted-foreground">Não sobre improviso.</span>
            </h2>
            <div className="space-y-2 mb-10">
              <p className="text-lg text-muted-foreground">Organize a sua operação.</p>
              <p className="text-lg text-muted-foreground">Automatize processos.</p>
              <p className="text-lg text-muted-foreground">Conecte-se ao mercado.</p>
            </div>
            <Link to="/auth">
              <Button size="lg" className="h-12 px-8 text-base">
                Iniciar Infraestrutura Digital
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold tracking-tight">FastCRM</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Infraestrutura digital para empresas modernas.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#ecossistema" className="hover:text-foreground transition-colors">Ecossistema</a></li>
                <li><a href="#planos" className="hover:text-foreground transition-colors">Planos</a></li>
                <li><a href="#rede" className="hover:text-foreground transition-colors">Rede Privada</a></li>
                <li><a href="#fastclub" className="hover:text-foreground transition-colors">FastClub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
                <li><Link to="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link></li>
                <li><Link to="/gdpr" className="hover:text-foreground transition-colors">RGPD</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 FastCRM. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
