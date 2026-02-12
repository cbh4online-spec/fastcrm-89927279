import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Briefcase,
  ChevronRight,
  Eye,
  FileCheck,
  Lock,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

const MARKET_PROBLEMS = [
  { icon: Users, label: "Volume sem critério" },
  { icon: Search, label: "Conexões superficiais" },
  { icon: Shield, label: "Falta de confidencialidade" },
  { icon: BarChart3, label: "Ausência de métricas" },
  { icon: Eye, label: "Exposição desnecessária" },
];

const STRUCTURE_ITEMS = [
  { icon: ShieldCheck, label: "Membros validados" },
  { icon: Scale, label: "Equilíbrio estratégico por setor" },
  { icon: BarChart3, label: "Dashboard de oportunidades rastreáveis" },
  { icon: Brain, label: "Matching baseado em critérios objetivos" },
  { icon: TrendingUp, label: "Resumo executivo mensal" },
  { icon: Zap, label: "Integração total com infraestrutura FastCRM" },
];

const MEMBER_PROFILES = [
  "Empresários estruturados",
  "Investidores estratégicos",
  "Decisores com poder real de execução",
  "Empresas com ambição de escala",
];

const ADMISSION_CRITERIA = [
  "Estrutura operacional",
  "Histórico profissional",
  "Capacidade de execução",
  "Alinhamento com os princípios do círculo",
];

const PROCESS_STEPS = [
  { step: "1", title: "Candidatura", desc: "Submissão de perfil estratégico." },
  { step: "2", title: "Validação", desc: "Análise interna e possível entrevista." },
  { step: "3", title: "Enquadramento", desc: "Definição de nível dentro do círculo." },
  { step: "4", title: "Integração", desc: "Acesso ao ambiente privado." },
];

const TIERS = [
  { color: "hsl(210,70%,55%)", name: "Capital Member", desc: "Entrada validada com quotas controladas." },
  { color: "hsl(221,83%,53%)", name: "Strategic Partner", desc: "Maior prioridade em oportunidades." },
  { color: "hsl(270,60%,55%)", name: "Executive Circle", desc: "Visibilidade estratégica reforçada." },
  { color: "hsl(45,90%,55%)", name: "Inner Circle", desc: "Acesso restrito e benefícios exclusivos." },
];

const CONFIDENTIALITY = [
  "Dados protegidos",
  "Interações rastreáveis",
  "Acesso segmentado",
  "Métricas privadas",
];

export default function FastClubLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canonicalUrl = `${getPublicBaseUrl()}/fastclub`;
  const { toast } = useToast();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);

    try {
      const { error } = await supabase.from('fastclub_applications' as any).insert({
        full_name: fd.get('full_name') as string,
        company: fd.get('company') as string,
        role: fd.get('role') as string,
        sector: fd.get('sector') as string,
        employees: (fd.get('employees') as string) || null,
        revenue: (fd.get('revenue') as string) || null,
        website_linkedin: (fd.get('website_linkedin') as string) || null,
        motivation: fd.get('motivation') as string,
        email: (fd.get('email') as string) || null,
      });

      if (error) throw error;

      toast({
        title: "Candidatura submetida",
        description: "Análise confidencial. Resposta em até 5 dias úteis.",
      });
      form.reset();
    } catch (err) {
      console.error('FastClub application error:', err);
      toast({
        title: "Erro ao submeter candidatura",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const navLinks = [
    { label: "Posicionamento", href: "#posicionamento" },
    { label: "Estrutura", href: "#estrutura" },
    { label: "Admissão", href: "#admissao" },
    { label: "Candidatura", href: "#candidatura" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(222,47%,4%)] text-[hsl(210,40%,98%)]">
      <Helmet>
        <title>FastClub — Private Capital Circle</title>
        <meta name="description" content="Círculo privado de capital e influência. Um ambiente restrito para empresários, investidores e decisores estratégicos." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="FastClub — Private Capital Circle" />
        <meta property="og:description" content="Círculo Privado de Capital e Influência." />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* Header */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[hsl(222,47%,4%)]/95 backdrop-blur-md border-b border-[hsl(217,33%,17%)] shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Lock className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">FastClub</span>
          </button>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[hsl(215,20%,75%)]">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-[hsl(210,40%,98%)] transition-colors">
                {link.label}
              </a>
            ))}
          </nav>
          <a href="#candidatura">
            <Button size="sm" className="gradient-primary shadow-glow text-primary-foreground font-semibold gap-1.5">
              Solicitar Avaliação
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </a>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="relative pt-32 pb-28 md:pt-44 md:pb-36 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-primary/6 blur-[180px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div {...fadeUp} transition={{ duration: 0.7 }} className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] px-4 py-1.5 text-xs font-medium text-[hsl(215,20%,75%)] tracking-wider uppercase">
                <Lock className="h-3 w-3" />
                Private Capital Circle
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Círculo Privado de{" "}
                <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
                  Capital e Influência.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
                Um ambiente restrito onde empresários, investidores e decisores estratégicos alinham oportunidades com método, controlo e métricas reais.
              </p>
              <div className="pt-2">
                <a href="#candidatura">
                  <Button size="lg" className="gradient-primary shadow-glow text-primary-foreground px-10 h-14 text-base font-semibold gap-2">
                    Solicitar Avaliação de Entrada
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
              <p className="text-xs text-[hsl(215,20%,55%)]">
                Acesso exclusivamente por convite ou candidatura validada.
              </p>
            </motion.div>
          </div>
        </section>

        {/* SECÇÃO 1 — POSICIONAMENTO */}
        <section id="posicionamento" className="relative py-28 lg:py-36">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div {...fadeUp} transition={{ duration: 0.7 }} className="space-y-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Não é uma comunidade.{" "}
                <span className="text-[hsl(215,20%,55%)]">É um círculo.</span>
              </h2>
              <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
                O FastClub Private Capital Circle foi concebido para:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
                {[
                  "Alinhar capital com oportunidade",
                  "Estruturar relações estratégicas",
                  "Controlar fluxo de negócios",
                  "Garantir responsabilidade entre membros",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 p-4 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]">
                    <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-base text-[hsl(215,20%,55%)] italic">
                Aqui, cada interação tem peso.
              </p>
            </motion.div>
          </div>
        </section>

        {/* SECÇÃO 2 — O PROBLEMA DO MERCADO */}
        <section className="relative py-28 lg:py-36">
          <div className="relative max-w-5xl mx-auto px-6 text-center">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                A maioria das redes empresariais opera com{" "}
                <span className="text-destructive">fragilidade.</span>
              </h2>
              <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto mb-16">
                Capital exige discrição. Influência exige estrutura.
              </p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {MARKET_PROBLEMS.map((item, i) => (
                <motion.div key={item.label} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]"
                >
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-destructive" />
                  </div>
                  <span className="text-xs font-medium text-[hsl(215,20%,65%)] text-center">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECÇÃO 3 — ESTRUTURA DO CÍRCULO */}
        <section id="estrutura" className="relative py-28 lg:py-36">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[150px]" />
          </div>
          <div className="relative max-w-5xl mx-auto px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
                Estrutura antes de{" "}
                <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
                  expansão.
                </span>
              </h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {STRUCTURE_ITEMS.map((item, i) => (
                <motion.div key={item.label} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="group flex items-center gap-4 p-5 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] hover:border-primary/40 transition-all duration-300"
                >
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </motion.div>
              ))}
            </div>
            <motion.div {...fadeUp} transition={{ delay: 0.4, duration: 0.5 }} className="mt-10 text-center">
              <p className="text-sm text-[hsl(215,20%,55%)]">
                Nada é informal. Nada é aleatório.
              </p>
            </motion.div>
          </div>
        </section>

        {/* SECÇÃO 4 — PERFIL DOS MEMBROS */}
        <section className="relative py-28 lg:py-36">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div {...fadeUp} transition={{ duration: 0.7 }} className="space-y-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Reservado a quem executa.
              </h2>
              <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto leading-relaxed">
                O Private Capital Circle é reservado a:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                {MEMBER_PROFILES.map((item) => (
                  <div key={item} className="rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-4 text-left">
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 pt-2">
                <p className="text-sm text-[hsl(215,20%,55%)]">Não é para curiosos.</p>
                <p className="text-sm text-[hsl(215,20%,55%)]">Não é para prospeção massiva.</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECÇÃO 5 — CRITÉRIOS DE ADMISSÃO */}
        <section id="admissao" className="relative py-28 lg:py-36">
          <div className="relative max-w-4xl mx-auto px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
                Entrada sujeita a{" "}
                <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
                  validação estratégica.
                </span>
              </h2>
              <p className="text-lg text-[hsl(215,20%,65%)] max-w-2xl mx-auto">
                A avaliação inclui:
              </p>
            </motion.div>
            <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              {ADMISSION_CRITERIA.map((item, i) => (
                <motion.div key={item} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]"
                >
                  <FileCheck className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
            <motion.p {...fadeUp} transition={{ delay: 0.4, duration: 0.5 }} className="mt-8 text-center text-sm text-[hsl(215,20%,55%)]">
              Pode existir limitação por setor para manter equilíbrio.
            </motion.p>
          </div>
        </section>

        {/* SECÇÃO 6 — DINÂMICA INTERNA */}
        <section className="relative py-28 lg:py-36">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Dinâmica interna.
              </h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PROCESS_STEPS.map((item, i) => (
                <motion.div key={item.step} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="relative p-6 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]"
                >
                  <div className="text-3xl font-bold text-primary/20 mb-3">{item.step}</div>
                  <h3 className="font-semibold text-sm mb-1.5">{item.title}</h3>
                  <p className="text-xs text-[hsl(215,20%,65%)] leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECÇÃO 7 — NÍVEIS DO CÍRCULO */}
        <section className="relative py-28 lg:py-36">
          <div className="relative max-w-5xl mx-auto px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
                Níveis do Círculo.
              </h2>
              <p className="text-sm text-[hsl(215,20%,55%)]">
                O número de membros por nível é intencionalmente limitado.
              </p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TIERS.map((tier, i) => (
                <motion.div key={tier.name} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="relative p-6 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: tier.color }} />
                  <h3 className="font-semibold text-sm mb-2 mt-2" style={{ color: tier.color }}>{tier.name}</h3>
                  <p className="text-xs text-[hsl(215,20%,65%)] leading-relaxed">{tier.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECÇÃO 8 — CONFIDENCIALIDADE */}
        <section className="relative py-28 lg:py-36">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[hsl(222,47%,6%)] to-transparent pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div {...fadeUp} transition={{ duration: 0.7 }} className="space-y-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Discrição é princípio base.
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                {CONFIDENTIALITY.map((item) => (
                  <div key={item} className="flex items-center gap-3 p-4 rounded-xl border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]">
                    <Lock className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[hsl(215,20%,55%)]">
                Sem exposição pública desnecessária.
              </p>
            </motion.div>
          </div>
        </section>

        {/* SECÇÃO 9 — POSICIONAMENTO FINAL */}
        <section className="relative py-28 lg:py-36">
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <motion.div {...fadeUp} transition={{ duration: 0.7 }} className="space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Preferimos{" "}
                <span className="bg-gradient-to-r from-primary to-[hsl(250,83%,60%)] bg-clip-text text-transparent">
                  impacto
                </span>{" "}
                a volume.
              </h2>
              <p className="text-lg text-[hsl(215,20%,65%)] max-w-xl mx-auto leading-relaxed">
                O FastClub Private Capital Circle não foi criado para ser grande. Foi criado para ser relevante.
              </p>
            </motion.div>
          </div>
        </section>

        {/* CANDIDATURA */}
        <section id="candidatura" className="relative py-28 lg:py-36">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[150px]" />
          </div>
          <div className="relative max-w-2xl mx-auto px-6">
            <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Se considera que o seu perfil está alinhado, pode solicitar avaliação.
              </h2>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.2, duration: 0.5 }}>
              <Card className="border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]">
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-[hsl(210,40%,98%)] text-xs">Nome</Label>
                        <Input name="full_name" required placeholder="Nome completo" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[hsl(210,40%,98%)] text-xs">Empresa</Label>
                        <Input name="company" required placeholder="Nome da empresa" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-[hsl(210,40%,98%)] text-xs">Cargo</Label>
                        <Input name="role" required placeholder="Cargo atual" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[hsl(210,40%,98%)] text-xs">Setor</Label>
                        <Input name="sector" required placeholder="Setor de atividade" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-[hsl(210,40%,98%)] text-xs">N.º Colaboradores</Label>
                        <Input name="employees" placeholder="Ex: 15" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[hsl(210,40%,98%)] text-xs">Faturação Estimada</Label>
                        <Input name="revenue" placeholder="Ex: 500K-1M EUR" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">Email</Label>
                      <Input name="email" type="email" placeholder="email@exemplo.com" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">Website / LinkedIn</Label>
                      <Input name="website_linkedin" placeholder="https://" className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)]" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[hsl(210,40%,98%)] text-xs">Porque pretende integrar o Private Capital Circle?</Label>
                      <Textarea name="motivation" required rows={4} placeholder="Descreva brevemente a sua motivação e expectativas." className="bg-[hsl(222,47%,8%)] border-[hsl(217,33%,17%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20%,45%)] resize-none" />
                    </div>
                    <Button type="submit" size="lg" disabled={isSubmitting} className="w-full gradient-primary shadow-glow text-primary-foreground h-12 text-base font-semibold">
                      {isSubmitting ? "A submeter..." : "Solicitar Avaliação"}
                    </Button>
                    <p className="text-xs text-center text-[hsl(215,20%,55%)]">
                      Análise confidencial. Resposta em até 5 dias úteis.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative py-28 lg:py-36">
          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <motion.div {...fadeUp} transition={{ duration: 0.7 }} className="space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                A influência não se pede.{" "}
                <span className="text-[hsl(215,20%,55%)]">Constrói-se.</span>
              </h2>
              <p className="text-lg text-[hsl(215,20%,65%)] max-w-xl mx-auto">
                Se entende isso, pode candidatar-se.
              </p>
              <div className="pt-2">
                <a href="#candidatura">
                  <Button size="lg" className="gradient-primary shadow-glow text-primary-foreground px-10 h-14 text-base font-semibold gap-2">
                    Solicitar Avaliação de Entrada
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 border-t border-[hsl(217,33%,17%)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[hsl(215,20%,55%)]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Lock className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-semibold text-[hsl(210,40%,98%)]">FastClub</span>
              <span className="text-[hsl(215,20%,35%)] mx-1">|</span>
              <span>Private Capital Circle</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/" className="hover:text-[hsl(210,40%,98%)] transition-colors">FastCRM</Link>
              <Link to="/auth" className="hover:text-[hsl(210,40%,98%)] transition-colors">Login</Link>
              <Link to="/terms" className="hover:text-[hsl(210,40%,98%)] transition-colors">Termos</Link>
              <Link to="/privacy" className="hover:text-[hsl(210,40%,98%)] transition-colors">Privacidade</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
