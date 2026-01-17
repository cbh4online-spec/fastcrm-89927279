import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  ArrowRight, 
  Shield, 
  Users, 
  Zap, 
  BarChart3,
  MessageSquare,
  Calendar,
  Target,
  Sparkles,
  CheckCircle2,
  Play,
  Star
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { 
    icon: Users, 
    title: "Gestão de Contactos", 
    description: "Organize todos os seus leads, contactos e empresas num só lugar com campos personalizáveis e segmentação avançada." 
  },
  { 
    icon: BarChart3, 
    title: "Pipeline Visual", 
    description: "Acompanhe oportunidades com um pipeline drag-and-drop intuitivo. Visualize o funil de vendas em tempo real." 
  },
  { 
    icon: MessageSquare, 
    title: "Comunicação Integrada", 
    description: "Email, WhatsApp e chamadas integrados. Histórico completo de interações com cada cliente." 
  },
  { 
    icon: Calendar, 
    title: "Agenda Inteligente", 
    description: "Calendário com agendamento automático, lembretes e sincronização com Google Calendar." 
  },
  { 
    icon: Sparkles, 
    title: "IA Integrada", 
    description: "Sugestões automáticas de próximas ações, análise de sentimento e previsão de conversão." 
  },
  { 
    icon: Target, 
    title: "Automações", 
    description: "Crie fluxos automáticos para nurturing, follow-ups e tarefas repetitivas sem escrever código." 
  },
];

const stats = [
  { value: "10x", label: "Mais produtividade" },
  { value: "85%", label: "Taxa de conversão" },
  { value: "2.5h", label: "Economia diária" },
  { value: "99.9%", label: "Uptime garantido" },
];

const testimonials = [
  {
    quote: "Triplicamos as nossas vendas em 6 meses. O FastCRM transformou completamente a nossa operação comercial.",
    author: "Maria Silva",
    role: "CEO, TechStart",
    rating: 5
  },
  {
    quote: "A integração com WhatsApp e a IA são game changers. Respondemos 3x mais rápido aos leads.",
    author: "João Santos",
    role: "Diretor Comercial, AgênciaX",
    rating: 5
  },
  {
    quote: "Finalmente um CRM que a equipa quer usar. Interface limpa, rápida e com tudo o que precisamos.",
    author: "Ana Costa",
    role: "Head of Sales, StartupY",
    rating: 5
  },
];

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">FastCRM</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
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
        {/* Background decorations */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-80 h-80 bg-info/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              Novo: IA integrada para vendas
            </div>
            
            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              O CRM que a sua{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
                  equipa vai adorar
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                  <path d="M2 6C50 2 150 2 198 6" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
                </svg>
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Gestão de leads, pipeline de vendas e comunicação integrada. 
              Tudo numa plataforma moderna com <span className="text-foreground font-medium">IA integrada</span> para acelerar resultados.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="h-14 px-8 text-lg shadow-xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-105">
                <Link to="/signup">
                  Começar grátis <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-8 text-lg group">
                <a href="#demo">
                  <Play className="mr-2 h-5 w-5 group-hover:text-primary transition-colors" />
                  Ver demonstração
                </a>
              </Button>
            </div>
            
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>14 dias grátis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Suporte em português</span>
              </div>
            </div>
          </div>
          
          {/* Hero Image/Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl shadow-black/20 overflow-hidden">
              <div className="aspect-[16/9] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 rounded-2xl gradient-primary mx-auto flex items-center justify-center shadow-glow">
                    <BarChart3 className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <p className="text-lg text-muted-foreground">Dashboard Preview</p>
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
            {features.map((feature, index) => (
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
            {testimonials.map((testimonial, index) => (
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
                <div className="pt-4 border-t border-border/50">
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold">
            Pronto para transformar as suas vendas?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Junte-se a centenas de empresas que já usam o FastCRM para crescer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="h-14 px-10 text-lg shadow-xl shadow-primary/30">
              <Link to="/signup">
                Começar grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
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
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FastCRM</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 FastCRM. Feito com ❤️ em Portugal.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
