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
  Sparkles,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Play
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
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FastCRM</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Funcionalidades
              </a>
              <a href="#ai" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                IA Copiloto
              </a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Preços
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                Começar grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>CRM potenciado por Inteligência Artificial</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              O CRM que{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                vende por ti
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              A IA analisa os teus leads, sugere próximos passos e automatiza tarefas. 
              Tu focas em fechar negócios, não em preencher fichas.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                  Começar trial grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                <Play className="mr-2 h-4 w-4" />
                Ver demo
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sem cartão de crédito · 14 dias grátis · Cancela quando quiseres
            </p>
          </div>
        </div>
      </section>

      {/* Product Visual */}
      <section className="container pb-24">
        <div className="relative mx-auto max-w-6xl">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-2xl opacity-50" />
          <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/30">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-muted-foreground ml-2">FastCRM Dashboard</span>
            </div>
            <div className="p-6 md:p-8 bg-gradient-to-br from-muted/20 to-muted/5">
              {/* Simulated Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Leads Ativos", value: "247", change: "+12%", icon: Users },
                  { label: "Taxa de Conversão", value: "23%", change: "+5%", icon: TrendingUp },
                  { label: "Valor Pipeline", value: "€142K", change: "+18%", icon: BarChart3 },
                ].map((stat, i) => (
                  <div key={i} className="rounded-xl bg-card border border-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{stat.value}</span>
                      <span className="text-xs text-green-600 font-medium">{stat.change}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-card border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Sugestões da IA</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      "Ligar ao João Silva - interesse alto detectado",
                      "Enviar proposta à TechCorp - deadline amanhã",
                      "Follow-up com 3 leads inativos há 7 dias",
                    ].map((suggestion, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-card border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Hoje</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { time: "10:00", task: "Call com prospect" },
                      { time: "14:30", task: "Demo para equipa" },
                      { time: "16:00", task: "Revisão de propostas" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground font-mono text-xs">{item.time}</span>
                        <span>{item.task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="features" className="container py-24 border-t border-border">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tudo o que precisas para vender mais
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas simples e poderosas que se adaptam à forma como a tua equipa trabalha.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Target,
              title: "Pipeline Visual",
              description: "Vê todos os teus negócios num pipeline drag-and-drop. Organiza, prioriza e nunca percas uma oportunidade.",
            },
            {
              icon: Zap,
              title: "Automação Inteligente",
              description: "Cria workflows que disparam automaticamente. Emails, tarefas e lembretes sem esforço manual.",
            },
            {
              icon: BarChart3,
              title: "Relatórios em Tempo Real",
              description: "Dashboards que te mostram o que importa. Previsões de vendas e métricas que guiam decisões.",
            },
          ].map((benefit, i) => (
            <Card key={i} className="group relative overflow-hidden border-border/50 bg-gradient-to-b from-card to-muted/20 hover:border-primary/30 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="relative p-8">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Copilot Section */}
      <section id="ai" className="relative overflow-hidden bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30 py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary">
                <Brain className="h-4 w-4" />
                <span>IA Copiloto</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                A IA que trabalha contigo, não contra ti
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                O nosso copiloto analisa cada interação, detecta padrões e sugere ações 
                concretas. É como ter um assistente de vendas experiente 24/7.
              </p>
              <div className="space-y-4">
                {[
                  "Análise automática de temperatura de leads",
                  "Sugestões de próximas ações baseadas em dados",
                  "Previsão de conversão e priorização inteligente",
                  "Resumos automáticos de conversas e reuniões",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl blur-xl" />
              <div className="relative space-y-4">
                {[
                  {
                    icon: MessageSquare,
                    title: "Insight detectado",
                    message: "O lead 'TechCorp' abriu a proposta 5 vezes nas últimas 24h. Probabilidade de fecho: 78%",
                    action: "Ligar agora",
                  },
                  {
                    icon: TrendingUp,
                    title: "Tendência identificada",
                    message: "Leads do setor 'Fintech' convertem 40% mais rápido. Sugiro focar aquisição neste segmento.",
                    action: "Ver análise",
                  },
                  {
                    icon: Calendar,
                    title: "Lembrete inteligente",
                    message: "O João Costa não responde há 5 dias. Baseado no histórico, emails às 10h têm melhor resposta.",
                    action: "Agendar email",
                  },
                ].map((insight, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <insight.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary mb-1">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mb-3">{insight.message}</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          {insight.action}
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container py-24 border-t border-border">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Equipas que já confiam em nós
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-60">
          {["TechStart", "SalesForce.pt", "GrowthCo", "VendaMais", "B2BPro", "DealFlow"].map((company, i) => (
            <div key={i} className="text-xl font-bold text-muted-foreground/80">
              {company}
            </div>
          ))}
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              quote: "Reduzimos o tempo de qualificação de leads em 60%. A IA faz o trabalho pesado.",
              author: "Maria Santos",
              role: "Sales Manager, TechStart",
            },
            {
              quote: "Finalmente um CRM que não precisamos de forçar a equipa a usar. É intuitivo e útil.",
              author: "Pedro Almeida",
              role: "CEO, GrowthCo",
            },
            {
              quote: "As sugestões da IA são incrivelmente precisas. Fechamos 30% mais negócios.",
              author: "Ana Costa",
              role: "Head of Sales, B2BPro",
            },
          ].map((testimonial, i) => (
            <Card key={i} className="border-border/50 bg-card">
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container py-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-12 md:p-16 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHoiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl md:text-5xl mb-4">
              Pronto para vender mais?
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto mb-8">
              Começa o teu trial gratuito hoje. Setup em 5 minutos, sem complicações.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold shadow-lg">
                  Começar trial grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="ghost" className="h-12 px-8 text-base text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10">
                Falar com vendas
              </Button>
            </div>
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
                  <Brain className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">FastCRM</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                O CRM com IA para equipas de vendas que querem vender mais.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrações</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Termos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">RGPD</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 FastCRM. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
