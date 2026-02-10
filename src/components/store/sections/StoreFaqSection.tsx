import { usePublicStoreFaqs } from "@/hooks/useStoreFaqs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface StoreFaqSectionProps {
  workspaceId: string;
}

export function StoreFaqSection({ workspaceId }: StoreFaqSectionProps) {
  const { data: faqs = [] } = usePublicStoreFaqs(workspaceId);

  if (faqs.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary mb-2">
            <HelpCircle className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">FAQ</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Perguntas Frequentes
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
