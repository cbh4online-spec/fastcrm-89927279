import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2, ArrowRight, Users, Zap, BarChart3, MessageSquare,
  Calendar, Target, Sparkles, CheckCircle2, Star, Mail, Phone,
  ChevronRight, TrendingUp, Bell, Search, LayoutDashboard,
  PieChart, ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: Users, title: "Gestão de Contactos", description: "Organize todos os seus leads, contactos e empresas num só lugar com campos personalizáveis e segmentação avançada." },
  { icon: BarChart3, title: "Pipeline Visual", description: "Acompanhe oportunidades com um pipeline drag-and-drop intuitivo. Visualize o funil de vendas em tempo real." },
  { icon: MessageSquare, title: "Comunicação Integrada", description: "Email, WhatsApp e chamadas integrados. Histórico completo de interações com cada cliente." },
  { icon: Calendar, title: "Agenda Inteligente", description: "Calendário com agendamento automático, lembretes e sincronização com Google Calendar." },
  { icon: Sparkles, title: "IA Integrada", description: "Sugestões automáticas de próximas ações, análise de sentimento e previsão de conversão." },
  { icon: Target, title: "Automações", description: "Crie fluxos automáticos para nurturing, follow-ups e tarefas repetitivas sem escrever código." },
];

const stats = [
  { value: "10x", label: "Mais produtividade" },
  { value: "85%", label: "Taxa de conversão" },
  { value: "2.5h", label: "Economia diária" },
  { value: "99.9%", label: "Uptime garantido" },
];

const testimonials = [
  { quote: "Triplicamos as nossas vendas em 6 meses. O FastCRM transformou completamente a nossa operação comercial.", author: "Maria Silva", role: "CEO, TechStart", rating: 5, initials: "MS", color: "from-pink-500 to-rose-500" },
  { quote: "A integração com WhatsApp e a IA são game changers. Respondemos 3x mais rápido aos leads.", author: "João Santos", role: "Diretor Comercial, AgênciaX", rating: 5, initials: "JS", color: "from-blue-500 to-indigo-500" },
  { quote: "Finalmente um CRM que a equipa quer usar. Interface limpa, rápida e com tudo o que precisamos.", author: "Ana Costa", role: "Head of Sales, StartupY", rating: 5, initials: "AC", color: "from-emerald-500 to-teal-500" },
];

const ctaOptions = [
  { icon: Phone, title: "Falar com um especialista", description: "Agende uma chamada gratuita de 30 minutos e descubra como o FastCRM se adapta ao seu negócio.", action: "Agendar chamada", href: "mailto:jorge.cardoso@metodopare.ai?subject=Quero saber mais sobre o FastCRM", highlight: true },
  { icon: Sparkles, title: "Ver demonstração ao vivo", description: "Assista a uma demo personalizada do FastCRM com um dos nossos especialistas.", action: "Pedir demo", href: "mailto:jorge.cardoso@metodopare.ai?subject=Pedido de Demo FastCRM", highlight: false },
  { icon: Mail, title: "Receber mais informações", description: "Envie-nos as suas dúvidas e entraremos em contacto nas próximas 24 horas.", action: "Enviar mensagem", href: "mailto:jorge.cardoso@metodopare.ai?subject=Mais informações FastCRM", highlight: false },
];

function DashboardPreview() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl shadow-black/20 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
            <Zap className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">FastCRM</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <Search className="w-3 h-3" />
            Pesquisar...
          </div>
          <div className="flex items-center gap-1">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            JC
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col w-40 border-r border-border/50 bg-muted/20 p-2 gap-0.5">
          {[
            { icon: LayoutDashboard, label: "Dashboard", active: true },
            { icon: Users, label: "Contactos", active: false },
            { icon: BarChart3, label: "Pipeline", active: false },
            { icon: Calendar, label: "Agenda", active: false },
            { icon: Target, label: "Automações", active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                item.active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-3 space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Novos Leads", value: "124", trend: "+12%", color: "text-primary" },
              { label: "Em Negociação", value: "38", trend: "+5%", color: "text-amber-500" },
              { label: "Fechados", value: "17", trend: "+8%", color: "text-emerald-500" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-border/50 bg-muted/20 p-2">
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</span>
                  <span className="text-[10px] text-emerald-500">{kpi.trend}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Pipeline mini */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-2">
              <p className="text-[10px] font-medium mb-2">Pipeline</p>
              <div className="space-y-1.5">
                {[
                  { stage: "Prospeção", pct: 75, color: "bg-blue-400" },
                  { stage: "Proposta", pct: 50, color: "bg-amber-400" },
                  { stage: "Negociação", pct: 30, color: "bg-primary" },
                ].map((s) => (
                  <div key={s.stage}>
                    <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                      <span>{s.stage}</span>
                      <span>{s.pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted">
                      <div className={`h-1 rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks mini */}
            <div className="rounded-lg border border-border/50 bg-muted/20 p-2">
              <p className="text-[10px] font-medium mb-2">Tarefas</p>
              <div className="space-y-1">
                {[
                  { task: "Follow-up Maria", done: true },
                  { task: "Enviar proposta João", done: true },
                  { task: "Call AgênciaX", done: false },
                  { task: "Demo StartupY", done: false },
                ].map((t) => (
                  <div key={t.task} className="flex items-center gap-1.5 text-[9px]">
                    <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${t.done ? "bg-emerald-500/20 border-emerald-500/50" : "border-border"}`}>
                      {t.done && <CheckCircle2 className="w-2 h-2 text-emerald-500" />}
                    </div>
                    <span className={t.done ? "line-through text-muted-foreground" : "text-foreground"}>
                      {t.task}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leads table mini */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-2">
            <p className="text-[10px] font-medium mb-2">Leads Recentes</p>
            <div className="space-y-1">
              {[
                { name: "Carlos Matos", company: "Empresa A", status: "Novo", color: "bg-blue-500/15 text-blue-500" },
                { name: "Sofia Lima", company: "Empresa B", status: "Contactado", color: "bg-amber-500/15 text-amber-500" },
                { name: "Rui Ferreira", company: "Empresa C", status: "Qualificado", color: "bg-emerald-500/15 text-emerald-500" },
              ].map((lead) => (
                <div key={lead.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary/30 to-blue-400/30 flex items-center justify-center text-[8px] font-bold">
                      {lead.name[0]}
                    </div>
                    <div>
                      <p className="text-[9px] font-medium">{lead.name}</p>
                      <p className="text-[8px] text-muted-foreground">{lead.company}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${lead.color}`}>
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">FastCRM</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Mais Informações</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testemunhos</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild className="shadow-lg shadow-primary/20">
                <Link to="/dashboard">Ir para Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild className="shadow-lg shadow-primary/20">
                  <Link to="/signup">Começar grátis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-info/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" />
                Novo: IA integrada para vendas
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                O CRM que a sua{" "}
                <span className="relative">
                  <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                    equipa vai adorar
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                    <path d="M2 6C50 2 150 2 198 6" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  </svg>
                </span>
              </h1>

              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                Gestão de leads, pipeline de vendas e comunicação integrada. Tudo numa plataforma moderna com{" "}
                <span className="text-foreground font-medium">IA integrada</span> para acelerar resultados.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="h-14 px-8 text-lg shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-105">
                  <Link to="/signup">
                    Começar grátis <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg group">
                  <a href="#contact">
                    <Mail className="mr-2 h-5 w-5 group-hover:text-primary transition-colors" />
                    Pedir mais informações
                  </a>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>14 dias grátis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Suporte em português</span>
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none rounded-2xl" />
              <DashboardPreview />

              {/* Floating badges */}
              <div className="absolute -left-4 top-1/3 z-20 hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-card/90 backdrop-blur-sm shadow-lg">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Esta semana</p>
                  <p className="text-xs font-semibold text-emerald-500">+24 novos leads</p>
                </div>
              </div>

              <div className="absolute -right-4 bottom-1/3 z-20 hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-card/90 backdrop-blur-sm shadow-lg">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">IA sugeriu</p>
                  <p className="text-xs font-semibold text-primary">3 follow-ups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">
              Tudo o que precisa para{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                vender mais
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas para gerir todo o ciclo de vendas, desde a captação até ao fecho.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl border border-border/50 bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold">
              O que dizem os nossos{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                clientes
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Empresas de todo o país confiam no FastCRM para gerir as suas vendas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.author}
                className="p-6 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm space-y-4"
              >
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-foreground/90 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-xs font-bold text-white`}>
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / CTA Section */}
      <section id="contact" className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-5xl font-bold">
              Quer saber mais?{" "}
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Estamos aqui
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fale connosco e descubra como o FastCRM se adapta ao seu negócio. Sem compromisso, sem pressão.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {ctaOptions.map((option) => (
              <a
                key={option.title}
                href={option.href}
                className={`relative group p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl ${
                  option.highlight
                    ? "border-primary/30 bg-primary/5 hover:shadow-primary/10"
                    : "border-border/50 bg-card/50 hover:border-primary/20 hover:shadow-primary/5"
                }`}
              >
                {option.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      Recomendado
                    </span>
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <option.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2 mb-4">
                  <h3 className="text-lg font-semibold">{option.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{option.description}</p>
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                  {option.action}
                  <ChevronRight className="w-4 h-4" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 relative overflow-hidden bg-muted/30 border-t border-border/50">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold">
            Pronto para transformar as suas vendas?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Junte-se a centenas de empresas que já usam o FastCRM para crescer mais rápido.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="h-14 px-10 text-lg shadow-xl shadow-primary/30">
              <Link to="/signup">
                Começar grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-10 text-lg">
              <a href="mailto:jorge.cardoso@metodopare.ai?subject=Contacto FastCRM">
                Falar connosco <Mail className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Configuração em 2 minutos • Sem compromisso • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50 bg-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FastCRM</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Termos</Link>
              <a href="mailto:jorge.cardoso@metodopare.ai" className="hover:text-foreground transition-colors">Contacto</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} FastCRM. Feito com ❤️ em Portugal.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
