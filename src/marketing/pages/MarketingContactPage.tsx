import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { LeadForm } from "@/marketing/components/LeadForm";
import { CheckCircle2, Mail, MessageSquare } from "lucide-react";

export default function MarketingContactPage() {
  return (
    <>
      <Helmet>
        <title>Contacto · FastCRM</title>
        <meta name="description" content="Fale com a equipa FastCRM. Resposta em menos de 24h úteis." />
        <link rel="canonical" href="https://fastcrm.metodopare.ai/contacto" />
        <meta property="og:title" content="Contacto · FastCRM" />
        <meta property="og:description" content="Fale com a equipa FastCRM. Resposta em menos de 24h úteis." />
        <meta property="og:image" content="https://fastcrm.metodopare.ai/og/og-contacto.jpg" />
        <meta property="og:url" content="https://fastcrm.metodopare.ai/contacto" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://fastcrm.metodopare.ai/og/og-contacto.jpg" />
      </Helmet>

      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-4">Contacto</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Vamos falar do seu projeto comercial.
          </h1>
          <p className="text-lg text-muted-foreground">
            Marque uma demo de 30 minutos ou diga-nos o que precisa. Resposta em menos de 24h úteis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">O que esperar da demo</h3>
              <ul className="space-y-3 text-sm">
                {[
                  "Análise rápida do seu funil atual",
                  "Demonstração com o seu caso real",
                  "Plano de implementação proposto",
                  "Estimativa de retorno em 30/60/90 dias",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Ou contacte-nos diretamente</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href="mailto:online@metodopare.ai" className="hover:text-primary">
                    online@metodopare.ai
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">
                    Resposta em menos de 24h úteis. Preencha o formulário e indicamos o contacto
                    telefónico ou WhatsApp da equipa responsável.
                  </span>
                </div>
              </div>
              <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
                FastCRM é um produto Simples &amp; Divertido, Lda · Portugal
              </p>
            </div>

          </div>

          <div className="lg:col-span-2">
            <LeadForm defaultLeadType="demo" sourcePage="contact" />
          </div>
        </div>
      </section>
    </>
  );
}
