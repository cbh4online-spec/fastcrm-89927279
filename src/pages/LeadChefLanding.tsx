import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { LeadChefShareCard } from "@/components/leadchef/LeadChefShareCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  CalendarCheck,
  ChefHat,
  ClipboardList,
  Flame,
  LineChart,
  MessageSquare,
  Sparkles,
  Target,
  Users,
  Utensils,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useLeadChefLandingContent } from "@/hooks/leadchef/useLeadChefLandingContent";
import { LeadChefPricingSection } from "@/components/leadchef/LeadChefPricingSection";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LEADCHEF_WORKSPACE_ID = "5f6416cd-9ce1-4395-a427-cb31049542b1";

const defaultModules = [
  {
    icon: ClipboardList,
    title: "Pipeline de leads",
    desc: "Da primeira conversa à venda — cada lead com a próxima ação clara, sem nada cair entre cadeiras.",
  },
  {
    icon: CalendarCheck,
    title: "Agenda de demonstrações",
    desc: "Marca, confirma e regista o resultado da demonstração culinária num único ecrã, com lembretes automáticos.",
  },
  {
    icon: Users,
    title: "Clientes e pós-venda",
    desc: "Ficha digital de cada cliente com equipamento, receitas favoritas e follow-ups pós-entrega.",
  },
  {
    icon: Sparkles,
    title: "Referências",
    desc: "Pedido de referência integrado, com autorização e conversão direta em novo lead atribuído.",
  },
  {
    icon: Target,
    title: "Objetivos mensais",
    desc: "Metas por agente e por equipa, progresso em tempo real e alertas quando o ritmo abranda.",
  },
  {
    icon: MessageSquare,
    title: "Templates WhatsApp",
    desc: "Mensagens prontas com variáveis (nome, próxima visita, receita) — tudo iniciado pelo agente, sem spam.",
  },
];

const defaultBenefits = [
  { value: "+38%", label: "demonstrações concluídas por mês" },
  { value: "−52%", label: "tempo gasto em follow-ups manuais" },
  { value: "+24%", label: "taxa de conversão lead → cliente" },
  { value: "100%", label: "rastreabilidade do ciclo de venda" },
];

const defaultJourney = [
  { step: "1", title: "Lead chega", desc: "Captado via formulário, indicação ou contacto direto." },
  { step: "2", title: "Conversa inicial", desc: "Qualificação rápida e agendamento da demonstração." },
  { step: "3", title: "Demonstração culinária", desc: "Receita, equipamento e resultado registados na hora." },
  { step: "4", title: "Proposta e venda", desc: "Decisão clara, com follow-up automático em caso de hesitação." },
  { step: "5", title: "Pós-venda e referência", desc: "Cliente fidelizado torna-se a próxima fonte de leads." },
];

const defaultFaqs = [
  {
    q: "Para que tipo de equipas foi feito o LeadChef?",
    a: "Para equipas que vendem com demonstrações culinárias presenciais — chefs, consultores e representantes que precisam de organizar leads, agenda, referências e pós-venda num só lugar.",
  },
  {
    q: "Posso usar sem conhecimentos técnicos?",
    a: "Sim. O LeadChef foi desenhado para uso operacional diário, com fluxos guiados e linguagem do terreno. A configuração inicial demora poucos minutos.",
  },
  {
    q: "Funciona em telemóvel?",
    a: "Sim — interface responsiva e PWA-friendly, pensada para usar entre demonstrações, no carro ou em casa do cliente.",
  },
  {
    q: "Como funciona a integração com WhatsApp?",
    a: "Disponibilizamos templates com variáveis e abertura direta da conversa via wa.me. Toda comunicação é iniciada pelo agente, respeitando a política do WhatsApp.",
  },
  {
    q: "Há período experimental?",
    a: "Sim. Pode experimentar gratuitamente e só decide depois de ver o LeadChef a trabalhar com a sua própria operação.",
  },
];

const ICON_MAP: Record<string, any> = {
  ClipboardList, CalendarCheck, Users, Sparkles, Target, MessageSquare,
  Utensils, LineChart, CheckCircle2, ChefHat, Flame,
};

export default function LeadChefLanding() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const signupSchema = z.object({
    name: z.string().trim().min(2, "Nome demasiado curto").max(120),
    email: z.string().trim().email("Email inválido").max(160),
    phone: z.string().trim().max(32).optional().or(z.literal("")),
    password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    setSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}/dashboard/leadchef/today`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: parsed.data.name,
            phone: parsed.data.phone || null,
            source: "leadchef-landing",
          },
        },
      });
      if (signUpError) {
        if (/already registered|already exists/i.test(signUpError.message)) {
          toast.error("Este email já tem conta. Faça login.");
        } else {
          toast.error(signUpError.message || "Não foi possível criar a conta.");
        }
        return;
      }

      // Best-effort: registar também como lead para a equipa LeadChef
      try {
        await supabase.functions.invoke("create-public-lead", {
          body: {
            workspace_id: LEADCHEF_WORKSPACE_ID,
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone || null,
            source: "Landing LeadChef — Registo",
          },
        });
      } catch (e) {
        console.warn("[LeadChef] Falha a registar lead paralelo:", e);
      }

      // Se sessão já criada (auto-confirm), entra direto na app
      if (signUpData.session) {
        toast.success("Conta criada! A entrar...");
        navigate("/dashboard/leadchef/today", { replace: true });
        return;
      }

      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", password: "" });
      toast.success("Conta criada! Confirme o seu email para entrar.");
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível submeter. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const { data: cms } = useLeadChefLandingContent();

  const modules = useMemo(() => {
    const list = (cms?.modules?.length ? cms.modules : defaultModules) as any[];
    return list.map((m, i) => ({
      ...m,
      icon: typeof m.icon === "string" ? (ICON_MAP[m.icon] ?? defaultModules[i % defaultModules.length].icon) : (m.icon ?? defaultModules[i % defaultModules.length].icon),
    }));
  }, [cms?.modules]);
  const benefits = cms?.benefits?.length ? cms.benefits : defaultBenefits;
  const journey = cms?.journey?.length ? cms.journey : defaultJourney;
  const faqs = cms?.faqs?.length ? cms.faqs : defaultFaqs;

  const hero = cms?.hero ?? {};
  const seo = cms?.seo ?? {};
  const ctas = cms?.ctas ?? {};

  const seoTitle = seo.title ?? "LeadChef — CRM para equipas de demonstração culinária";
  const seoDescription = seo.description ?? "LeadChef organiza leads, demonstrações, clientes e referências para equipas de venda com demonstração culinária. Agende uma demonstração ou experimente grátis.";
  const ogTitle = seo.ogTitle ?? seoTitle;
  const ogDescription = seo.ogDescription ?? "Da primeira conversa à venda. Pipeline, agenda, pós-venda e referências num só lugar, pensado para chefs e consultores.";
  const canonical = seo.canonical ?? "/leadchef";

  return (
    <>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="website" />
        {cms?.images?.ogImage && <meta property="og:image" content={cms.images.ogImage} />}
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground antialiased">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link to="/leadchef" className="flex items-center gap-2 font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ChefHat className="h-5 w-5" />
              </span>
              <span className="text-lg">LeadChef</span>
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
              <a href="#solucao" className="hover:text-foreground">Solução</a>
              <a href="#modulos" className="hover:text-foreground">Módulos</a>
              <a href="#fluxo" className="hover:text-foreground">Como funciona</a>
              <a href="#precos" className="hover:text-foreground">Preços</a>
              <a href="#faq" className="hover:text-foreground">FAQ</a>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/dashboard/leadchef/today">
                <Button variant="ghost" size="sm" className="hidden gap-1 sm:inline-flex">
                  Entrar na app <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#contacto">
                <Button size="sm" className="gap-1">
                  Agendar demo <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </header>

        <main>
          {/* Hero */}
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
            <div className="container mx-auto px-4 py-20 md:py-28">
              <div className="mx-auto max-w-3xl text-center space-y-6">
                <Badge variant="secondary" className="gap-1">
                  <Flame className="h-3 w-3" /> {hero.badge ?? "CRM dedicado a demonstrações culinárias"}
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                  {hero.title ?? "Da primeira receita à venda fechada — "}
                  <span className="text-primary">{hero.highlight ?? "tudo num só lugar"}</span>
                  {!hero.title && "."}
                </h1>
                <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
                  {hero.subtitle ?? "O LeadChef organiza leads, agenda, clientes e referências para equipas que vendem com demonstrações culinárias. Menos folhas de cálculo, mais cozinha."}
                </p>
                <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                  <a href={hero.primaryCtaHref ?? "#contacto"}>
                    <Button size="lg" className="gap-2 px-8">
                      <CalendarCheck className="h-5 w-5" /> {hero.primaryCtaLabel ?? "Agendar demonstração"}
                    </Button>
                  </a>
                  <a href={hero.secondaryCtaHref ?? "#contacto"}>
                    <Button size="lg" variant="outline" className="gap-2 px-8">
                      <Sparkles className="h-5 w-5" /> {hero.secondaryCtaLabel ?? "Experimentar grátis"}
                    </Button>
                  </a>
                </div>
                <div className="pt-2">
                  <Link
                    to={ctas.appHref ?? "/dashboard/leadchef/today"}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Explorar a aplicação LeadChef <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  {hero.microCopy ?? "✓ Sem cartão de crédito · ✓ Setup em minutos · ✓ Português de Portugal"}
                </p>
              </div>

              {/* Stats */}
              <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
                {benefits.map((b) => (
                  <Card key={b.label} className="border-primary/10 bg-card/50">
                    <CardContent className="p-6 text-center">
                      <div className="text-3xl font-bold text-primary md:text-4xl">{b.value}</div>
                      <div className="mt-2 text-xs text-muted-foreground md:text-sm">{b.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Problema */}
          <section className="border-y bg-muted/30 py-20">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Vender com cozinha exige outro tipo de CRM
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Folhas de cálculo perdem leads. Agendas em papel falham follow-ups. CRMs genéricos não percebem o que é uma demonstração culinária.
                </p>
              </div>
              <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
                {[
                  "Leads dispersos entre WhatsApp, papel e cabeça do agente",
                  "Demonstrações sem registo do que foi cozinhado e do resultado",
                  "Referências esquecidas no dia seguinte à venda",
                ].map((p) => (
                  <Card key={p} className="border-destructive/20">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground">{p}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Solução */}
          <section id="solucao" className="py-20">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl text-center">
                <Badge variant="secondary">A solução</Badge>
                <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                  Um CRM desenhado a partir da cozinha
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Cada estado do lead, cada compromisso na agenda e cada template de mensagem foi pensado para o ritmo de quem demonstra, cozinha e vende no mesmo dia.
                </p>
              </div>

              <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
                {[
                  { icon: Utensils, title: "Linguagem do terreno", desc: "Estados como demo agendada, demo concluída, proposta — não etapas abstratas de funil." },
                  { icon: LineChart, title: "Visibilidade real", desc: "Líder vê a equipa em tempo real: quem está atrasado, quem precisa de apoio, quem está a brilhar." },
                  { icon: MessageSquare, title: "Comunicação fluida", desc: "Templates de WhatsApp prontos para confirmar visita, pedir feedback ou solicitar referência." },
                  { icon: CheckCircle2, title: "Permissões por papel", desc: "Agente vê o seu, líder vê a equipa, admin governa tudo. RLS por workspace." },
                ].map((f) => (
                  <Card key={f.title} className="border-primary/10">
                    <CardContent className="flex gap-4 p-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <f.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{f.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Módulos */}
          <section id="modulos" className="border-y bg-muted/30 py-20">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl text-center">
                <Badge variant="secondary">Módulos</Badge>
                <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                  Tudo o que a equipa precisa, nada que distraia
                </h2>
              </div>
              <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => (
                  <Card key={m.title} className="group transition-all hover:border-primary/40 hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <m.icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 font-semibold">{m.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{m.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Fluxo */}
          <section id="fluxo" className="py-20">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl text-center">
                <Badge variant="secondary">Como funciona</Badge>
                <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                  Do primeiro contacto à fidelização
                </h2>
              </div>
              <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-5">
                {journey.map((s, i) => (
                  <div key={s.step} className="relative">
                    <Card className="h-full">
                      <CardContent className="p-5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {s.step}
                        </div>
                        <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                      </CardContent>
                    </Card>
                    {i < journey.length - 1 && (
                      <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-primary md:block" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Preços (Stripe) */}
          <LeadChefPricingSection id="precos" className="border-y bg-muted/30" />

          {/* Testemunho */}
          <section className="border-y bg-primary/5 py-20">
            <div className="container mx-auto px-4">
              <Card className="mx-auto max-w-3xl border-primary/20">
                <CardContent className="p-8 text-center md:p-12">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <blockquote className="mt-6 text-xl font-medium leading-relaxed md:text-2xl">
                    "Antes do LeadChef perdíamos uma em cada três demonstrações por falha de follow-up. Hoje o pipeline é claro, a equipa sabe o que fazer a seguir e fechamos mais vendas com menos esforço."
                  </blockquote>
                  <p className="mt-6 text-sm text-muted-foreground">
                    Diretora Comercial · Equipa de demonstração culinária
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="py-20">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl">
                <div className="text-center">
                  <Badge variant="secondary">FAQ</Badge>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                    Perguntas frequentes
                  </h2>
                </div>
                <Accordion type="single" collapsible className="mt-8">
                  {faqs.map((f, i) => (
                    <AccordionItem key={i} value={`item-${i}`}>
                      <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>

          {/* Formulário de registo */}
          <section id="contacto" className="border-t bg-gradient-to-b from-background to-primary/10 py-20">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
                  Pronto para vender mais com a sua cozinha?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                  Deixe os seus dados — entramos em contacto para agendar uma demonstração e dar-lhe acesso ao LeadChef.
                </p>
              </div>

              <Card className="mx-auto mt-10 max-w-xl border-primary/20">
                <CardContent className="p-6 md:p-8">
                  {submitted ? (
                    <div className="text-center space-y-4 py-6">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-semibold">Conta criada!</h3>
                      <p className="text-sm text-muted-foreground">
                        Enviámos-lhe um email de confirmação. Confirme para entrar na app LeadChef.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Link to="/auth">
                          <Button variant="outline">Já confirmei — entrar</Button>
                        </Link>
                        <Button variant="ghost" onClick={() => setSubmitted(false)}>
                          Criar outra conta
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="lc-name">Nome *</Label>
                          <Input
                            id="lc-name"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="O seu nome"
                            required
                            maxLength={120}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lc-phone">Telemóvel</Label>
                          <Input
                            id="lc-phone"
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="+351 ..."
                            maxLength={32}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lc-email">Email *</Label>
                        <Input
                          id="lc-email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="email@empresa.pt"
                          required
                          maxLength={160}
                          autoComplete="email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lc-pass">Palavra-passe *</Label>
                        <Input
                          id="lc-pass"
                          type="password"
                          value={form.password}
                          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder="Mínimo 8 caracteres"
                          required
                          minLength={8}
                          maxLength={72}
                          autoComplete="new-password"
                        />
                      </div>
                      <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                        {submitting ? (
                          <><Loader2 className="h-5 w-5 animate-spin" /> A criar conta...</>
                        ) : (
                          <><CalendarCheck className="h-5 w-5" /> Criar conta LeadChef</>
                        )}
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        Já tem conta?{" "}
                        <Link to="/auth" className="font-medium text-primary hover:underline">
                          Entrar
                        </Link>
                      </p>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        {/* Partilha pública */}
        <section className="container mx-auto px-4 pb-12">
          <div className="mx-auto max-w-2xl">
            <LeadChefShareCard
              url={typeof window !== "undefined" ? window.location.origin + "/leadchef" : "https://fastcrm.lovable.app/leadchef"}
              title="Gostas? Partilha o LeadChef"
              description="Mostra a outras Consultoras Bimby como organizar a agenda e vender mais."
              message="Conhece o LeadChef — o CRM feito para Consultoras Bimby:"
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-background py-10">
          <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ChefHat className="h-4 w-4" />
              </span>
              <span>© {new Date().getFullYear()} LeadChef</span>
            </div>
            <div className="flex gap-6">
              <a href="#solucao" className="hover:text-foreground">Solução</a>
              <a href="#modulos" className="hover:text-foreground">Módulos</a>
              <a href="#faq" className="hover:text-foreground">FAQ</a>
              <a href="#contacto" className="hover:text-foreground">Contacto</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
