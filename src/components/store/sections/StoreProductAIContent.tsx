/**
 * Secções da ficha pública alimentadas pelo conteúdo estruturado do AI Commerce:
 *  - "Para quem é" (público-alvo, problema resolvido, casos de uso);
 *  - "Perguntas frequentes".
 * Só renderiza o que existir — não gera conteúdo.
 */
import { HelpCircle, Target, Users } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ResolvedStoreProductContent } from "@/lib/store/productContent";

interface Props {
  content: ResolvedStoreProductContent;
}

export function StoreProductAIContext({ content }: Props) {
  if (!content.hasAIContext) return null;

  return (
    <section id="para-quem-e" className="rounded-xl border bg-card/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Para quem é</h2>
      </div>

      {content.targetAudience && (
        <p className="text-sm text-muted-foreground leading-relaxed">{content.targetAudience}</p>
      )}

      {content.problemSolved && (
        <div className="flex items-start gap-2">
          <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">{content.problemSolved}</p>
        </div>
      )}

      {content.useCases.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Casos de uso</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {content.useCases.map((useCase, index) => (
              <li key={index} className="rounded-lg border bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                {useCase}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function StoreProductAIFaq({ content }: Props) {
  if (content.faq.length === 0) return null;

  return (
    <section id="perguntas-frequentes" className="space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Perguntas frequentes</h2>
      </div>
      <Accordion type="single" collapsible className="rounded-xl border bg-card/50 px-4">
        {content.faq.map((entry, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger className="text-left text-sm">{entry.question}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
              {entry.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
