import { useEffect, useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Users,
  Kanban,
  CheckSquare,
  CalendarClock,
  Sparkles,
  LayoutDashboard,
  ArrowRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { HeaderV2 } from "@/components/landing-fastcrm-v2/HeaderV2";
import { FooterV2 } from "@/components/landing-fastcrm-v2/Sections3";
import {
  Section,
  SectionHeader,
  Eyebrow,
  Reveal,
  BrandGlow,
} from "@/components/landing-fastcrm-v2/_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Inbox comercial",
    desc: "Centraliza conversas importantes vindas de WhatsApp, redes sociais e formulários num único lugar.",
  },
  {
    icon: Users,
    title: "Gestão de contactos",
    desc: "Cada lead fica identificado, com histórico, etiquetas e contexto comercial sempre à mão.",
  },
  {
    icon: Kanban,
    title: "Pipeline visual",
    desc: "Vê em que fase está cada oportunidade e o que falta fazer para avançar.",
  },
  {
    icon: CheckSquare,
    title: "Tarefas e follow-up",
    desc: "A equipa sabe sempre qual é o próximo passo. Nada fica esquecido na cabeça de ninguém.",
  },
  {
    icon: CalendarClock,
    title: "Agendamento",
    desc: "Transforma conversas em reuniões marcadas, com confirmação e lembretes automáticos.",
  },
  {
    icon: Sparkles,
    title: "IA comercial",
    desc: "Resume conversas longas, sugere a próxima ação e prioriza quem deve ser acompanhado primeiro.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Visão clara de leads, oportunidades, reuniões e vendas — em tempo real.",
  },
];

const PROBLEMS = [
  "Leads sem resposta",
  "Conversas esquecidas",
  "Follow-ups feitos tarde demais",
  "Propostas sem acompanhamento",
  "Reuniões que não são marcadas",
  "Dono da empresa sem visão comercial",
  "Equipa a trabalhar por memória",
];

const TARGETS = [
  "Clínicas",
  "Estética",
  "Terapeutas",
  "Formação",
  "Consultores",
  "Imobiliárias",
  "Serviços locais",
  "Equipas comerciais pequenas",
  "Negócios que recebem leads por WhatsApp, redes sociais ou formulários",
];

const FOUNDER_INCLUDES = [
  "Setup inicial",
  "Configuração do processo comercial",
  "Pipeline adaptado ao negócio",
  "Templates de resposta e follow-up",
  "Dashboard base",
  "Formação inicial",
  "Acompanhamento de arranque",
];

const FAQS = [
  {
    q: "O FastCRM substitui o WhatsApp?",
    a: "Não. O FastCRM organiza o processo comercial à volta das conversas e ajuda a transformar mensagens em oportunidades, tarefas, reuniões e vendas.",
  },
  {
    q: "Preciso de equipa técnica para usar?",
    a: "Não. A implementação é acompanhada e a configuração inicial é feita com base no processo comercial da empresa.",
  },
  {
    q: "Isto é só para grandes empresas?",
    a: "Não. Foi pensado especialmente para pequenas empresas, clínicas, consultores, equipas comerciais e negócios que vendem por conversa.",
  },
  {
    q: "A inteligência artificial responde automaticamente aos clientes?",
    a: "Pode apoiar com resumos, sugestões de resposta, próxima ação e priorização. A automação deve ser configurada conforme o nível de controlo desejado pela empresa.",
  },
  {
    q: "O que está incluído no setup?",
    a: "Análise do processo, configuração do pipeline, campos, templates, tarefas, dashboard e formação inicial.",
  },
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  company: string;
  area: string;
  leadsPerWeek: string;
  difficulty: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  area: "",
  leadsPerWeek: "",
  difficulty: "",
};

const LEADS_TO_TEAM: Record<string, string> = {
  "0-10": "1",
  "11-30": "2-5",
  "31-100": "6-20",
  "100+": "20+",
};

export default function FastCRMWhatsAppSalesLanding() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.company || !form.area || !form.leadsPerWeek || !form.difficulty) {
      toast.error("Por favor preencha todos os campos.");
      return;
    }
    setSubmitting(true);
    try {
      const companyEnriched = `${form.company} | Tel: ${form.phone} | Leads/semana: ${form.leadsPerWeek} | Dificuldade: ${form.difficulty}`;
      const { error } = await supabase.functions.invoke("create-demo-lead", {
        body: {
          name: form.name,
          email: form.email,
          company: companyEnriched,
          businessType: "outro",
          businessTypeOther: `${form.area} (WhatsApp Sales)`,
          objectives: ["leads", "atendimento"],
          teamSize: LEADS_TO_TEAM[form.leadsPerWeek] ?? "2-5",
          urgency: "semanas",
        },
      });
      if (error) throw error;
      setSubmitted(true);
      setForm(INITIAL_FORM);
    } catch (err) {
      console.error("demo lead submit error", err);
      toast.error("Não foi possível enviar o pedido. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>FastCRM WhatsApp Sales — Transforme o WhatsApp num canal de vendas</title>
        <meta
          name="description"
          content="Centralize conversas, qualifique leads, acompanhe oportunidades e automatize follow-ups com IA. Agende uma demonstração do FastCRM WhatsApp Sales."
        />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/fastcrm-whatsapp-sales" />

        {/* OpenGraph */}
        <meta property="og:url" content="https://fastcrm.metodopare.ai/fastcrm-whatsapp-sales" />
        <meta property="og:title" content="FastCRM WhatsApp Sales — Conversas que viram vendas" />
        <meta
          property="og:description"
          content="Organize WhatsApp, redes sociais e formulários num só CRM. Pipeline, follow-up e IA comercial."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://fastcrm.metodopare.ai/og/og-home.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="pt_PT" />
        <meta property="og:site_name" content="FastCRM" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FastCRM WhatsApp Sales — Conversas que viram vendas" />
        <meta
          name="twitter:description"
          content="Organize WhatsApp, redes sociais e formulários num só CRM. Pipeline, follow-up e IA comercial."
        />
        <meta name="twitter:image" content="https://fastcrm.metodopare.ai/og/og-home.jpg" />

        {/* JSON-LD: FAQPage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": FAQS.map((f) => ({
              "@type": "Question",
              "name": f.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": f.a,
              },
            })),
          })}
        </script>

        {/* JSON-LD: WebPage + Product */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "FastCRM WhatsApp Sales",
            "description": "Transforme o WhatsApp num canal organizado de vendas com pipeline, follow-up e IA comercial.",
            "url": "https://fastcrm.metodopare.ai/fastcrm-whatsapp-sales",
            "isPartOf": {
              "@type": "WebSite",
              "name": "FastCRM",
              "url": "https://fastcrm.metodopare.ai/",
            },
            "about": {
              "@type": "SoftwareApplication",
              "name": "FastCRM WhatsApp Sales",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "CRM comercial que centraliza WhatsApp, redes sociais e formulários num pipeline de vendas com IA.",
              "offers": {
                "@type": "Offer",
                "price": "79",
                "priceCurrency": "EUR",
                "description": "Setup 350€ + 79€/mês",
              },
            },
          })}
        </script>

        {/* JSON-LD: BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://fastcrm.metodopare.ai/",
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "FastCRM WhatsApp Sales",
                "item": "https://fastcrm.metodopare.ai/fastcrm-whatsapp-sales",
              },
            ],
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground antialiased">
        <HeaderV2 />

        <main>
          {/* HERO */}
          <section className="relative overflow-hidden px-6 pt-32 pb-20 md:px-10 md:pt-40 md:pb-28">
            <BrandGlow className="left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2" variant="mix" />
            <div className="relative mx-auto max-w-5xl text-center">
              <Reveal>
                <Eyebrow>FastCRM WhatsApp Sales</Eyebrow>
              </Reveal>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-navy md:text-6xl"
              >
                Transforme o WhatsApp num{" "}
                <span className="bg-gradient-to-r from-brand to-cyan-500 bg-clip-text text-transparent">
                  canal organizado de vendas
                </span>
              </motion.h1>
              <Reveal delay={0.15}>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-500 md:text-xl">
                  O FastCRM WhatsApp Sales ajuda a sua empresa a centralizar conversas, qualificar leads,
                  acompanhar oportunidades, agendar reuniões e automatizar follow-ups com inteligência artificial.
                </p>
              </Reveal>
              <Reveal delay={0.25}>
                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={() => scrollTo("formulario")}
                    className="h-12 gap-2 px-7 text-base"
                  >
                    Agendar demonstração
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => scrollTo("solucao")}
                    className="h-12 gap-2 px-7 text-base"
                  >
                    <Play className="h-4 w-4" />
                    Ver como funciona
                  </Button>
                </div>
              </Reveal>

              {/* Visual mock */}
              <Reveal delay={0.4}>
                <div className="relative mx-auto mt-16 max-w-4xl">
                  <div className="rounded-2xl border border-navy/10 bg-card p-4 shadow-2xl shadow-brand/10 md:p-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <MockCard
                        icon={<MessageCircle className="h-5 w-5 text-brand" />}
                        title="Inbox"
                        items={["Ana — pediu orçamento", "João — quer agendar", "Marta — dúvida sobre preço"]}
                      />
                      <MockCard
                        icon={<Kanban className="h-5 w-5 text-brand" />}
                        title="Pipeline"
                        items={["Qualificação · 12", "Proposta · 5", "Negociação · 3", "Fechado · 8"]}
                      />
                      <MockCard
                        icon={<Sparkles className="h-5 w-5 text-brand" />}
                        title="IA sugere"
                        items={[
                          "Responder à Ana hoje",
                          "Marcar follow-up com João",
                          "Enviar proposta à Marta",
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* PROBLEMA */}
          <Section id="problema" className="bg-muted/30">
            <SectionHeader
              eyebrow="O problema"
              title="Está a perder vendas sem perceber?"
              subtitle="Todos os dias entram mensagens, pedidos de orçamento, dúvidas e contactos interessados. Mas quando essas conversas ficam espalhadas no WhatsApp, email, Instagram ou na cabeça da equipa, muitas oportunidades acabam esquecidas."
            />
            <Reveal>
              <div className="mx-auto mb-12 max-w-3xl rounded-2xl border border-brand/20 bg-brand/5 px-6 py-6 text-center">
                <p className="font-display text-xl font-medium text-navy md:text-2xl">
                  O problema não é falta de leads. O problema é falta de processo.
                </p>
              </div>
            </Reveal>
            <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
              {PROBLEMS.map((p, i) => (
                <Reveal key={p} delay={i * 0.05}>
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                    <span className="text-navy-700">{p}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </Section>

          {/* SOLUÇÃO */}
          <Section id="solucao">
            <SectionHeader
              eyebrow="A solução"
              title="Com o FastCRM, cada conversa passa a ter seguimento"
              subtitle="Organiza contactos, cria oportunidades, mostra o estado de cada lead, lembra a equipa do próximo passo e usa IA para priorizar quem deve ser acompanhado primeiro."
            />
            <Reveal>
              <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-brand to-cyan-500 px-6 py-8 text-center text-white shadow-xl shadow-brand/20">
                <p className="font-display text-xl font-medium md:text-2xl">
                  Menos oportunidades perdidas. Mais reuniões marcadas. Mais vendas acompanhadas até ao fecho.
                </p>
              </div>
            </Reveal>
          </Section>

          {/* FUNCIONALIDADES */}
          <Section id="funcionalidades" className="bg-muted/30">
            <SectionHeader
              eyebrow="Funcionalidades"
              title="Tudo o que precisa para vender por conversa"
            />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 0.05}>
                  <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-all hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform group-hover:scale-110">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-display text-lg font-semibold text-navy">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-navy-500">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Section>

          {/* PARA QUEM */}
          <Section id="para-quem">
            <SectionHeader
              eyebrow="Para quem é"
              title="Criado para empresas que vendem por conversa"
            />
            <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TARGETS.map((t, i) => (
                <Reveal key={t} delay={i * 0.04}>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-brand" />
                    <span className="text-navy-700">{t}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </Section>

          {/* FOUNDER */}
          <Section id="founder" className="bg-muted/30">
            <SectionHeader
              eyebrow="Oferta limitada"
              title="Oferta Founder FastCRM WhatsApp Sales"
              subtitle="Estamos a abrir uma fase inicial para empresas fundadoras que queiram implementar o FastCRM com acompanhamento direto."
            />
            <Reveal>
              <div className="mx-auto max-w-3xl rounded-3xl border border-brand/20 bg-card p-8 shadow-xl shadow-brand/5 md:p-12">
                <div className="mb-8 flex flex-col items-baseline justify-center gap-2 text-center sm:flex-row sm:gap-4">
                  <div>
                    <span className="font-display text-5xl font-semibold text-navy md:text-6xl">350€</span>
                    <span className="ml-1 text-navy-500">setup</span>
                  </div>
                  <span className="text-navy-400">+</span>
                  <div>
                    <span className="font-display text-5xl font-semibold text-navy md:text-6xl">79€</span>
                    <span className="ml-1 text-navy-500">/mês</span>
                  </div>
                </div>

                <ul className="mb-8 grid gap-3 sm:grid-cols-2">
                  {FOUNDER_INCLUDES.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
                      <span className="text-navy-700">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl bg-brand/5 px-4 py-3 text-center text-sm text-brand">
                  Oferta limitada às primeiras 10 empresas.
                </div>

                <div className="mt-8 flex justify-center">
                  <Button
                    size="lg"
                    onClick={() => scrollTo("formulario")}
                    className="h-12 gap-2 px-7 text-base"
                  >
                    Quero ser empresa Founder
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Reveal>
          </Section>

          {/* FORMULÁRIO */}
          <Section id="formulario">
            <SectionHeader
              eyebrow="Demonstração"
              title="Agende uma demonstração FastCRM"
              subtitle="Conte-nos sobre o vosso processo comercial. Voltamos para mostrar como o FastCRM se adapta."
            />
            <Reveal>
              <div className="mx-auto max-w-2xl">
                {submitted ? (
                  <div className="rounded-2xl border border-brand/20 bg-brand/5 p-8 text-center md:p-12">
                    <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-brand" />
                    <h3 className="mb-3 font-display text-2xl font-semibold text-navy">Obrigado!</h3>
                    <p className="text-navy-500">
                      Recebemos o seu pedido de demonstração. A nossa equipa irá entrar em contacto para perceber
                      o vosso processo comercial e mostrar como o FastCRM pode ajudar.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={onSubmit}
                    className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nome" required>
                        <Input
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                          maxLength={100}
                        />
                      </Field>
                      <Field label="Email" required>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                          maxLength={200}
                        />
                      </Field>
                      <Field label="Telemóvel / WhatsApp" required>
                        <Input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          required
                          maxLength={30}
                        />
                      </Field>
                      <Field label="Nome da empresa" required>
                        <Input
                          value={form.company}
                          onChange={(e) => setForm({ ...form, company: e.target.value })}
                          required
                          maxLength={120}
                        />
                      </Field>
                    </div>

                    <Field label="Área de negócio" required>
                      <Input
                        placeholder="Ex.: Clínica estética, Imobiliária, Formação..."
                        value={form.area}
                        onChange={(e) => setForm({ ...form, area: e.target.value })}
                        required
                        maxLength={120}
                      />
                    </Field>

                    <Field label="Quantas leads recebe por semana?" required>
                      <Select
                        value={form.leadsPerWeek}
                        onValueChange={(v) => setForm({ ...form, leadsPerWeek: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um intervalo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-10">Menos de 10</SelectItem>
                          <SelectItem value="11-30">Entre 10 e 30</SelectItem>
                          <SelectItem value="31-100">Entre 30 e 100</SelectItem>
                          <SelectItem value="100+">Mais de 100</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field label="Principal dificuldade atual" required>
                      <Textarea
                        value={form.difficulty}
                        onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                        required
                        rows={3}
                        maxLength={500}
                        placeholder="Ex.: Leads sem resposta, falta de follow-up, equipa desorganizada..."
                      />
                    </Field>

                    <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          A enviar...
                        </>
                      ) : (
                        <>
                          Quero ver o FastCRM em ação
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </Reveal>
          </Section>

          {/* FAQ */}
          <Section id="faq" className="bg-muted/30">
            <SectionHeader eyebrow="FAQ" title="Perguntas frequentes" />
            <Reveal>
              <div className="mx-auto max-w-3xl">
                <Accordion type="single" collapsible className="w-full">
                  {FAQS.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-left text-navy hover:text-brand">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-navy-500">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Reveal>
          </Section>

          {/* CTA FINAL */}
          <Section id="cta-final">
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-brand px-6 py-16 text-center text-white md:px-12 md:py-20">
                <BrandGlow className="left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2" variant="cyan" />
                <div className="relative">
                  <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-tight md:text-5xl">
                    Pronto para deixar de perder vendas no WhatsApp?
                  </h2>
                  <p className="mx-auto mt-5 max-w-xl text-white/80 md:text-lg">
                    Agende uma demonstração e mostramos como o FastCRM se adapta ao processo da sua empresa.
                  </p>
                  <div className="mt-8 flex justify-center">
                    <Button
                      size="lg"
                      onClick={() => scrollTo("formulario")}
                      className="h-12 gap-2 bg-white px-7 text-base text-navy hover:bg-white/90"
                    >
                      Agendar demonstração
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </Section>
        </main>

        <FooterV2 />
      </div>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-navy-700">
        {label} {required && <span className="text-brand">*</span>}
      </Label>
      {children}
    </div>
  );
}

function MockCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 text-left">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-navy">{title}</span>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className="rounded-md bg-muted/60 px-3 py-2 text-xs text-navy-700"
          >
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
