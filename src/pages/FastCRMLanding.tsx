import { Link } from "react-router-dom";
import DemoRequestForm from "@/components/landing/DemoRequestForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Play,
  Check,
  X,
  Zap,
  Brain,
  Package,
  TrendingUp,
  Settings,
  Mail,
  BookOpen,
  FileText,
  BarChart3,
  Shield,
  Users,
  Lock,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Building2,
  Handshake,
  ChevronRight,
} from "lucide-react";

// Feature data
const features = [
  {
    icon: Settings,
    title: "CRM Adaptativo",
    description: "Pipelines, campos e workflows que se moldam ao teu processo de vendas real.",
  },
  {
    icon: Mail,
    title: "Inbox Inteligente",
    description: "Todas as conversas num só lugar, com contexto automático e sugestões de resposta.",
  },
  {
    icon: BookOpen,
    title: "Base de Conhecimento",
    description: "A IA responde apenas com informação validada da tua empresa.",
  },
  {
    icon: Package,
    title: "Produtos & Serviços",
    description: "Produtos simples, pacotes, sessões avulsas e subscrições — tudo configurável.",
  },
  {
    icon: FileText,
    title: "Propostas & Pagamentos",
    description: "Cria propostas profissionais e acompanha pagamentos sem sair do CRM.",
  },
  {
    icon: BarChart3,
    title: "Dashboards & Previsões",
    description: "Vê margens reais, previsões de receita e alertas antes de ser tarde.",
  },
];

// Sectors data
const sectors = [
  { icon: GraduationCap, name: "Escolas & Formação" },
  { icon: HeartPulse, name: "Clínicas & Saúde" },
  { icon: Briefcase, name: "Consultores & Coaches" },
  { icon: Building2, name: "Agências & Serviços" },
  { icon: Handshake, name: "Empresas B2B" },
];

// Comparison data
const comparisons = [
  { traditional: "Estrutura rígida", fastcrm: "Adaptativo desde o dia 1" },
  { traditional: "IA genérica que inventa", fastcrm: "IA com conhecimento validado" },
  { traditional: "Relatórios do passado", fastcrm: "Previsões acionáveis" },
  { traditional: "Várias ferramentas dispersas", fastcrm: "Tudo num só sistema" },
];

// FAQ data
const faqs = [
  {
    question: "É difícil configurar?",
    answer: "Não. Descreves o teu negócio e o FastCRM configura tudo automaticamente — pipelines, produtos, métricas. Podes ajustar tudo depois, quando quiseres.",
  },
  {
    question: "Serve para o meu setor?",
    answer: "Sim. O FastCRM adapta-se a qualquer negócio B2B: formação, saúde, consultoria, agências, serviços. O sistema ajusta-se à tua realidade, não o contrário.",
  },
  {
    question: "A IA é segura?",
    answer: "Absolutamente. A nossa IA só responde com base em conhecimento validado da tua empresa. Nunca inventa informação nem acede a dados de outros clientes.",
  },
  {
    question: "Posso escalar com o sistema?",
    answer: "Sim. O FastCRM cresce contigo — desde freelancers a equipas com dezenas de utilizadores, com roles e permissões granulares.",
  },
];

export default function FastCRMLanding() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FastCRM</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#funcionalidades" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Como funciona
            </a>
            <a href="#setores" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Setores
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <a href="#demo">Pedir demo</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="w-4 h-4" />
              CRM com Inteligência Artificial
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              O CRM com IA que se adapta{" "}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                ao teu negócio
              </span>
              {" "}— não o contrário.
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              O FastCRM centraliza vendas, atendimento, produtos, automações e previsões financeiras
              num único sistema inteligente, ajustado à forma como a tua empresa realmente funciona.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="h-14 px-8 text-base" asChild>
                <a href="#demo">
                  Pedir demonstração personalizada
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base">
                <Play className="mr-2 h-5 w-5" />
                Ver como funciona (2 min)
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-4">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                Sem contratos longos
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                Configuração assistida
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                Dados isolados por empresa
              </span>
            </div>
          </div>
          
          {/* Product Mockup Placeholder */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-muted overflow-hidden shadow-2xl">
              <div className="h-8 bg-muted border-b border-border/50 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-card to-muted/50 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Dashboard FastCRM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Porque é que a maioria dos CRMs falha?
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-6 text-left">
              {[
                "Processos reais não cabem em CRMs rígidos",
                "Ferramentas espalhadas e dados sem contexto",
                "IA genérica que inventa respostas",
                "Decisões tomadas tarde demais",
              ].map((problem, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-background border border-border">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                  <p className="text-foreground font-medium pt-1">{problem}</p>
                </div>
              ))}
            </div>
            
            <div className="pt-8">
              <p className="text-xl text-muted-foreground italic">
                "O problema não é falta de dados.<br />
                <span className="text-foreground font-medium">É falta de clareza.</span>"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-6 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              O FastCRM adapta-se à tua empresa desde o primeiro dia.
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Onboarding inteligente",
                description: "Descreves o teu negócio, o sistema adapta-se automaticamente.",
              },
              {
                icon: Shield,
                title: "IA governada",
                description: "Responde apenas com conhecimento validado da tua empresa.",
              },
              {
                icon: Package,
                title: "Produtos vivos",
                description: "Produtos simples, pacotes, sessões e recorrência — tudo configurável.",
              },
              {
                icon: TrendingUp,
                title: "Visão financeira real",
                description: "Margens, previsões e alertas para decidir antes de ser tarde.",
              },
              {
                icon: Zap,
                title: "Automações com contexto",
                description: "Ações automáticas com motivo claro e impacto medido.",
              },
            ].map((item, i) => (
              <Card key={i} className="border-border/50 bg-card/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" asChild>
              <a href="#funcionalidades">
                Ver todas as funcionalidades
                <ChevronRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="como-funciona" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-6 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Como funciona
            </h2>
            <p className="text-xl text-muted-foreground">
              Do primeiro acesso a resultados reais em 3 passos simples.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Descreve o teu negócio",
                description: "Responde a algumas perguntas simples sobre como trabalhas.",
              },
              {
                step: "2",
                title: "O FastCRM configura tudo",
                description: "Pipelines, produtos, métricas e automações — tudo pronto.",
              },
              {
                step: "3",
                title: "Acompanha, decide e cresce",
                description: "Com dados claros e IA útil ao teu lado.",
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-2xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground mt-12">
            ✨ Tudo pode ser ajustado a qualquer momento.
          </p>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="funcionalidades" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center space-y-6 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Funcionalidades principais
            </h2>
            <p className="text-xl text-muted-foreground">
              Tudo o que precisas para gerir clientes, vendas e operações.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/30 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors Section */}
      <section id="setores" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Feito para quem vive de clientes.
            </h2>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {sectors.map((sector, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-6 py-4 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors"
              >
                <sector.icon className="w-5 h-5 text-primary" />
                <span className="font-medium">{sector.name}</span>
              </div>
            ))}
          </div>
          
          <p className="text-center text-lg text-muted-foreground">
            O sistema adapta-se ao setor, <span className="text-foreground font-medium">não o contrário.</span>
          </p>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              O que nos diferencia
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 text-muted-foreground font-medium">Característica</th>
                  <th className="text-center py-4 px-4 text-muted-foreground font-medium">CRMs Tradicionais</th>
                  <th className="text-center py-4 px-4 font-medium text-primary">FastCRM</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-4 px-4 font-medium">{row.traditional.split(" ")[0]}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <X className="w-4 h-4 text-destructive" />
                        {row.traditional}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        {row.fastcrm}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Segurança e controlo total
            </h2>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Building2, text: "Workspaces isolados por empresa" },
              { icon: Users, text: "Utilizadores com roles e permissões" },
              { icon: Brain, text: "IA que não inventa respostas" },
              { icon: Lock, text: "Total controlo sobre dados e automações" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-background border border-border">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
          
          <p className="text-center text-lg text-muted-foreground mt-12">
            "Clareza para decidir. <span className="text-foreground font-medium">Segurança para crescer.</span>"
          </p>
        </div>
      </section>

      {/* Final CTA Section with Demo Form */}
      <section id="demo" className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Text */}
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold">
                Vê como seria gerir o teu negócio com clareza total.
              </h2>
              
              <p className="text-lg text-muted-foreground">
                Preenche o formulário e recebe uma demonstração personalizada, 
                adaptada ao teu tipo de negócio e objetivos.
              </p>
              
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Configuração assistida</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Sem compromisso</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Adaptado ao teu negócio</span>
                </div>
              </div>
            </div>
            
            {/* Right: Form */}
            <DemoRequestForm />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Perguntas frequentes
            </h2>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border rounded-lg px-6 bg-background"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">FastCRM</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Contacto</a>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 FastCRM. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
