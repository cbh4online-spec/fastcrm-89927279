import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, ArrowRight, Trophy, Wallet, Link2, Repeat, Sparkles } from "lucide-react";
import { AMBASSADOR_TIERS, formatPercent } from "@/config/leadchef/ambassadorTiers";
import { formatEuro } from "@/config/leadchef/pricing";

export default function LeadChefAmbassadorPublicPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Programa de Embaixadores LeadChef — Comissões recorrentes</title>
        <meta
          name="description"
          content="Recomenda o LeadChef e ganha comissões recorrentes vitalícias. 5 níveis com comissões até 35% sobre mensalidades e anuidades."
        />
      </Helmet>

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/leadchef" className="flex items-center gap-2 font-semibold">
            <ChefHat className="h-5 w-5 text-primary" />
            LeadChef
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/leadchef/precos">
              <Button variant="ghost" size="sm">Preços</Button>
            </Link>
            <Link to="/embaixador/registo">
              <Button size="sm" className="gap-2">Tornar-me embaixador <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <Badge variant="secondary" className="mb-4 gap-1"><Sparkles className="h-3 w-3" /> Programa de Embaixadores</Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto">
          Recomenda. Ganha. <span className="text-primary">Para sempre.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Partilha o teu link único do LeadChef e recebe comissões recorrentes
          vitalícias sobre mensalidades e anuidades dos clientes que indicares.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/embaixador/registo">
            <Button size="lg" className="gap-2">Quero o meu link <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Link to="/embaixador/dashboard">
            <Button size="lg" variant="outline">Já sou embaixador</Button>
          </Link>
        </div>
      </section>

      {/* Como funciona */}
      <section className="container mx-auto px-4 pb-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: Link2, title: "Recebes o teu link único", desc: "Partilhas com a tua rede, redes sociais ou clientes interessados." },
          { icon: Repeat, title: "Comissão vitalícia", desc: "Ganhas todos os meses enquanto o cliente mantiver subscrição ativa." },
          { icon: Wallet, title: "Levantas a partir de 50€", desc: "Pedes o pagamento no painel; recebes por transferência bancária." },
        ].map((s) => (
          <Card key={s.title}><CardContent className="pt-6">
            <s.icon className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </CardContent></Card>
        ))}
      </section>

      {/* Tiers */}
      <section className="container mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <Badge variant="outline" className="gap-1 mb-3"><Trophy className="h-3 w-3" /> 5 Níveis</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Cresces, sobes de nível</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            O teu nível atualiza automaticamente com base na receita mensal recorrente
            que geras. Quanto mais alto, maior a comissão.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {AMBASSADOR_TIERS.map((t, i) => (
            <Card key={t.slug} className={i === AMBASSADOR_TIERS.length - 1 ? "border-primary shadow-lg" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">Nível {i + 1}</span>
                  {i === AMBASSADOR_TIERS.length - 1 && <Badge>Top</Badge>}
                </div>
                <h3 className="text-xl font-bold mb-1">{t.name}</h3>
                <div className="text-3xl font-bold text-primary mb-1">{formatPercent(t.commissionRate)}</div>
                <p className="text-xs text-muted-foreground mb-4">
                  {t.maxMonthlyRevenue
                    ? `${formatEuro(t.minMonthlyRevenue)} – ${formatEuro(t.maxMonthlyRevenue)}/mês gerados`
                    : `${formatEuro(t.minMonthlyRevenue)}+/mês gerados`}
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {t.perks.slice(0, 2).map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Comissão calculada sobre o valor líquido das mensalidades e anuidades cobradas (excl. IVA).
          O nível atualiza no início de cada mês com base na receita ativa do mês anterior.
        </p>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/30">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Pronto para começar?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Cria o teu perfil de embaixador em menos de 1 minuto e começa a partilhar o teu link.
            </p>
            <Link to="/embaixador/registo">
              <Button size="lg" className="gap-2">Criar conta de embaixador <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LeadChef · Programa de Embaixadores · Pagamentos por transferência bancária SEPA
      </footer>
    </div>
  );
}
