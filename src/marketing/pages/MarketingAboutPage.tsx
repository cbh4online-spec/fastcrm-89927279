import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PARE = [
  { letter: "P", title: "Planeamento", text: "Estrutura comercial clara: pipeline, capacidade da equipa, metas e prioridades por consultor." },
  { letter: "A", title: "Automação", text: "IA e workflows que eliminam tarefas repetitivas — mensagens, propostas, faturação e seguimento." },
  { letter: "R", title: "Resultados", text: "Decisões baseadas em dados: KPIs, relatórios, previsão de receita e risco de pipeline." },
  { letter: "E", title: "Eficiência", text: "Mais negócios fechados com menos esforço — tempo libertado para o que gera valor." },
];

export default function MarketingAboutPage() {
  return (
    <>
      <Helmet>
        <title>Sobre · FastCRM</title>
        <meta name="description" content="O método e a equipa por trás do FastCRM." />
      </Helmet>
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-4">Sobre nós</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Construído por quem vive o comercial todos os dias.
          </h1>
          <p className="text-lg text-muted-foreground">
            O FastCRM nasceu da metodologia <strong>Método PARE</strong> — uma abordagem testada em centenas de equipas comerciais portuguesas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
          {PARE.map((p) => (
            <div key={p.letter} className="rounded-2xl border border-border bg-card p-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground text-2xl font-bold">
                  {p.letter}
                </div>
                <h3 className="text-xl font-semibold">{p.title}</h3>
              </div>
              <p className="text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card p-8 md:p-10 mb-16">
          <h2 className="text-2xl font-bold mb-4">A nossa missão</h2>
          <p className="text-muted-foreground mb-3">
            Devolver às PME portuguesas a vantagem de vender melhor — com a mesma equipa, em menos tempo, com mais previsibilidade.
          </p>
          <p className="text-muted-foreground">
            Acreditamos que tecnologia + método são mais poderosos do que ferramentas isoladas. Por isso o FastCRM unifica CRM, IA, marketing, faturação e comércio numa única plataforma.
          </p>
        </div>

        <div className="text-center">
          <Button size="lg" asChild>
            <Link to="/contacto?tipo=demo">Conhecer o método em ação</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
