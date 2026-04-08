import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, TrendingUp, Users, Wallet, Gift, Shield, MousePointerClick,
  ArrowRight, CheckCircle2, Zap, Globe, BarChart3, Star, ChevronDown
} from "lucide-react";

const PLANS = [
  { name: "Starter", price: 29 },
  { name: "Pro", price: 79 },
  { name: "Business", price: 199 },
];

function EarningsCalculator() {
  const [referrals, setReferrals] = useState(10);
  const [planIdx, setPlanIdx] = useState(1);
  const commission = 0.2;
  const plan = PLANS[planIdx];
  const monthly = referrals * plan.price * commission;
  const yearly = monthly * 12;

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardContent className="pt-6 space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground">Calculadora de Ganhos</h3>
          <p className="text-sm text-muted-foreground">Veja quanto pode ganhar com comissões recorrentes</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Nº de clientes referidos</Label>
            <Input type="number" min={1} max={500} value={referrals} onChange={e => setReferrals(Math.max(1, parseInt(e.target.value) || 1))} className="text-lg font-bold text-center" />
            <input type="range" min={1} max={100} value={referrals} onChange={e => setReferrals(parseInt(e.target.value))} className="w-full mt-2 accent-primary" />
          </div>
          <div>
            <Label className="text-sm font-medium">Plano médio dos clientes</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {PLANS.map((p, i) => (
                <button key={p.name} onClick={() => setPlanIdx(i)}
                  className={`rounded-lg border py-2 px-3 text-sm font-medium transition-all ${planIdx === i ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                  {p.name} <span className="block text-xs">€{p.price}/mês</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-xl bg-primary/5 p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium">Por Mês</p>
            <p className="text-3xl font-black text-primary">€{monthly.toFixed(0)}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-center border border-primary/20">
            <p className="text-xs text-muted-foreground font-medium">Por Ano</p>
            <p className="text-3xl font-black text-primary">€{yearly.toFixed(0)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">Comissão de {(commission * 100).toFixed(0)}% recorrente em cada renovação</p>
      </CardContent>
    </Card>
  );
}

const BENEFITS = [
  { icon: TrendingUp, title: "20% Comissão Recorrente", desc: "Ganhe em cada renovação, todos os meses, para sempre." },
  { icon: Gift, title: "Cookie de 30 Dias", desc: "O visitante tem 30 dias para converter após clicar no seu link." },
  { icon: Users, title: "Multinível (2 Níveis)", desc: "Ganhe também com afiliados que recrutar (nível 2)." },
  { icon: Wallet, title: "Pagamentos Flexíveis", desc: "Receba via transferência, Stripe ou crédito na plataforma." },
  { icon: Shield, title: "Dashboard em Tempo Real", desc: "Acompanhe cliques, conversões e ganhos ao segundo." },
  { icon: Globe, title: "Materiais de Marketing", desc: "Banners, textos e templates prontos a usar." },
];

const STEPS = [
  { num: "01", title: "Inscreva-se", desc: "Crie a sua conta de afiliado em menos de 1 minuto.", icon: Rocket },
  { num: "02", title: "Partilhe", desc: "Use os seus links personalizados nas redes sociais, blog ou email.", icon: MousePointerClick },
  { num: "03", title: "Ganhe", desc: "Receba comissões recorrentes por cada cliente que converter.", icon: Wallet },
];

const FAQS = [
  { q: "Quanto posso ganhar?", a: "Não há limite! Recebe 20% de comissão recorrente em cada renovação mensal ou anual dos clientes que referir." },
  { q: "Quando recebo os pagamentos?", a: "Os pagamentos são processados mensalmente, após aprovação das conversões. O valor mínimo de payout é €50." },
  { q: "O que é o sistema multinível?", a: "Se recrutar outros afiliados, ganha uma comissão de 2º nível sobre as vendas deles (5% por defeito)." },
  { q: "Preciso de ser cliente para ser afiliado?", a: "Não é obrigatório, mas recomendamos que conheça o produto para poder promovê-lo melhor." },
  { q: "Posso usar publicidade paga?", a: "Sim, desde que não faça bidding no nome 'FastCRM' em campanhas de pesquisa." },
];

export default function AffiliatePublicPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">Fast<span className="text-primary">CRM</span></Link>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
            <a href="#inscricao"><Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Tornar-me Afiliado</Button></a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/3" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-6">
              <Badge variant="outline" className="border-primary/30 text-primary px-4 py-1.5">
                <Zap className="h-3.5 w-3.5 mr-1.5" /> Programa de Afiliados
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground leading-tight">
                Ganhe <span className="text-primary">comissões recorrentes</span> a promover o FastCRM
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                20% de comissão em cada renovação, todos os meses, para sempre. 
                Junte-se a dezenas de afiliados que já transformaram a sua rede em receita passiva.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#inscricao"><Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8"><Rocket className="h-5 w-5 mr-2" /> Começar Agora</Button></a>
                <a href="#como-funciona"><Button size="lg" variant="outline" className="text-base">Como Funciona <ArrowRight className="h-4 w-4 ml-2" /></Button></a>
              </div>
              <div className="flex items-center gap-6 pt-2">
                {[
                  { label: "Comissão", value: "20%" },
                  { label: "Cookie", value: "30 dias" },
                  { label: "Pagamento", value: "Mensal" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-black text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
              <EarningsCalculator />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Porquê ser Afiliado FastCRM?</h2>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Um programa pensado para maximizar os seus ganhos com transparência total.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b, i) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="h-full hover:shadow-lg transition-shadow border-border/50 hover:border-primary/30">
                  <CardContent className="pt-6 space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <b.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Como Funciona</h2>
            <p className="text-muted-foreground mt-3">3 passos simples para começar a ganhar</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative text-center space-y-4">
                <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                  <s.icon className="h-8 w-8 text-primary" />
                </div>
                <span className="absolute -top-3 -right-2 text-6xl font-black text-primary/10">{s.num}</span>
                <h3 className="text-xl font-bold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">O que dizem os nossos afiliados</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Ricardo M.", role: "Consultor Digital", quote: "Em 3 meses já gero mais de €500/mês em comissões recorrentes. O dashboard é fantástico." },
              { name: "Ana S.", role: "Agência Marketing", quote: "Recomendo o FastCRM aos meus clientes e ganho comissão em cada renovação. Win-win total." },
              { name: "Pedro L.", role: "Freelancer", quote: "O sistema multinível permite-me ganhar também com afiliados que recruto. Genial." },
            ].map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="h-full">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex gap-1">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-primary text-primary" />)}</div>
                    <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
                    <div>
                      <p className="font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-foreground">{f.q}</span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-6 pb-4">
                    <p className="text-sm text-muted-foreground">{f.a}</p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="inscricao" className="py-20 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-foreground">Pronto para começar a ganhar?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Inscreva-se no programa de afiliados, receba o seu link personalizado e comece a ganhar comissões recorrentes hoje mesmo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/signup?redirect=/dashboard/affiliates">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-10">
                <Rocket className="h-5 w-5 mr-2" /> Criar Conta e Inscrever-me
              </Button>
            </Link>
            <Link to="/login?redirect=/dashboard/affiliates">
              <Button size="lg" variant="outline" className="text-base">
                Já tenho conta
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-6 text-sm text-muted-foreground">
            {["Inscrição gratuita", "Sem compromisso", "Pagamentos mensais", "Suporte dedicado"].map(t => (
              <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> {t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} FastCRM. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link to="/pricing" className="hover:text-foreground transition-colors">Preços</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}