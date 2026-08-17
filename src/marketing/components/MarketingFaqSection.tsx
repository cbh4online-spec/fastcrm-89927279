import { Helmet } from "react-helmet-async";
import { MARKETING_FAQ } from "@/marketing/data/faq";

interface MarketingFaqSectionProps {
  /** Título da secção */
  title?: string;
  /** Incluir JSON-LD FAQPage (apenas numa página por site para evitar duplicação) */
  withSchema?: boolean;
}

/**
 * FAQ em texto plano (sem acordeão JS) para ser lida por crawlers de motores
 * de busca e por sistemas de IA generativa (GEO).
 */
export function MarketingFaqSection({
  title = "Perguntas frequentes",
  withSchema = false,
}: MarketingFaqSectionProps) {
  return (
    <section className="container mx-auto px-4 py-16 md:py-20" aria-labelledby="faq-heading">
      {withSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: MARKETING_FAQ.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            })}
          </script>
        </Helmet>
      )}

      <div className="max-w-3xl mx-auto">
        <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          {title}
        </h2>
        <p className="text-muted-foreground mb-10">
          Respostas diretas sobre preços, funcionalidades e conformidade do FastCRM.
        </p>

        <dl className="space-y-8">
          {MARKETING_FAQ.map((item) => (
            <div key={item.question} className="border-b border-border pb-6 last:border-0">
              <dt className="text-lg font-semibold mb-2">{item.question}</dt>
              <dd className="text-muted-foreground leading-relaxed">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default MarketingFaqSection;
