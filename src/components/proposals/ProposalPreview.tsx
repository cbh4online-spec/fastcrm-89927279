import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Quote, ChevronDown, ChevronUp, Smartphone, Monitor } from "lucide-react";
import { useState } from "react";
import type { ContentBlock } from "@/types/proposal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProposalPreviewProps {
  title: string;
  blocks: ContentBlock[];
  variables: Record<string, string>;
  ctaText?: string;
  ctaColor?: string;
  price?: number | null;
  currency?: string;
  showCta?: boolean;
  onCtaClick?: () => void;
}

// Replace variables in text
function replaceVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return variables[trimmedKey] ?? match;
  });
}

// Format currency
function formatCurrency(value: number, currency: string = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

export function ProposalPreview({
  title,
  blocks,
  variables,
  ctaText = "Aceitar Proposta",
  ctaColor = "#3b82f6",
  price,
  currency = "BRL",
  showCta = true,
  onCtaClick,
}: ProposalPreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant={device === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => setDevice("desktop")}
        >
          <Monitor className="h-4 w-4 mr-2" />
          Desktop
        </Button>
        <Button
          variant={device === "mobile" ? "default" : "outline"}
          size="sm"
          onClick={() => setDevice("mobile")}
        >
          <Smartphone className="h-4 w-4 mr-2" />
          Mobile
        </Button>
      </div>

      <div
        className={`mx-auto bg-background border rounded-lg shadow-lg overflow-hidden transition-all ${
          device === "mobile" ? "max-w-[375px]" : "max-w-4xl"
        }`}
      >
        {/* Header */}
        <div className="bg-primary/5 p-6 md:p-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {replaceVariables(title, variables)}
          </h1>
          {price && (
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {formatCurrency(price, currency)}
            </Badge>
          )}
        </div>

        {/* Content Blocks */}
        <div className="p-6 md:p-10 space-y-8">
          {blocks.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              variables={variables}
              ctaColor={ctaColor}
              onCtaClick={onCtaClick}
            />
          ))}
        </div>

        {/* Footer CTA */}
        {showCta && (
          <div className="bg-muted/50 p-6 md:p-10 text-center">
            <Button
              size="lg"
              className="px-8 py-6 text-lg"
              style={{ backgroundColor: ctaColor }}
              onClick={onCtaClick}
            >
              {ctaText}
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Pagamento seguro via Stripe
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockRenderer({
  block,
  variables,
  ctaColor,
  onCtaClick,
}: {
  block: ContentBlock;
  variables: Record<string, string>;
  ctaColor?: string;
  onCtaClick?: () => void;
}) {
  const content = block.content;

  switch (block.type) {
    case "text":
      return (
        <div className="space-y-3">
          {content.title && (
            <h2 className="text-xl font-semibold">
              {replaceVariables(content.title as string, variables)}
            </h2>
          )}
          {content.body && (
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {replaceVariables(content.body as string, variables)}
            </div>
          )}
        </div>
      );

    case "image":
      return (
        <figure className="space-y-2">
          {content.url && (
            <img
              src={content.url as string}
              alt={(content.alt as string) || ""}
              className="w-full rounded-lg object-cover max-h-96"
            />
          )}
          {content.caption && (
            <figcaption className="text-center text-sm text-muted-foreground">
              {replaceVariables(content.caption as string, variables)}
            </figcaption>
          )}
        </figure>
      );

    case "offer":
      const features = (content.features as string[]) || [];
      const priceText = replaceVariables(
        (content.price as string) || "",
        variables
      );

      return (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="text-center space-y-4">
            {content.title && (
              <h2 className="text-2xl font-bold">
                {replaceVariables(content.title as string, variables)}
              </h2>
            )}
            {content.description && (
              <p className="text-muted-foreground">
                {replaceVariables(content.description as string, variables)}
              </p>
            )}
            {priceText && (
              <div className="text-3xl font-bold text-primary">{priceText}</div>
            )}
            {features.length > 0 && (
              <ul className="space-y-2 text-left max-w-md mx-auto">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{replaceVariables(feature, variables)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      );

    case "testimonials":
      const testimonials =
        (content.items as Array<{
          author: string;
          text: string;
          role?: string;
        }>) || [];

      return (
        <div className="space-y-4">
          {content.title && (
            <h2 className="text-xl font-semibold text-center">
              {replaceVariables(content.title as string, variables)}
            </h2>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((item, i) => (
              <Card key={i} className="p-4">
                <Quote className="h-6 w-6 text-primary/30 mb-2" />
                <p className="text-sm mb-3">
                  {replaceVariables(item.text, variables)}
                </p>
                <div className="text-sm">
                  <span className="font-medium">{item.author}</span>
                  {item.role && (
                    <span className="text-muted-foreground"> · {item.role}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      );

    case "faq":
      const faqs =
        (content.items as Array<{ question: string; answer: string }>) || [];

      return (
        <div className="space-y-4">
          {content.title && (
            <h2 className="text-xl font-semibold text-center">
              {replaceVariables(content.title as string, variables)}
            </h2>
          )}
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>
                  {replaceVariables(item.question, variables)}
                </AccordionTrigger>
                <AccordionContent>
                  {replaceVariables(item.answer, variables)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );

    case "divider":
      const style = (content.style as string) || "line";
      if (style === "space") {
        return <div className="h-8" />;
      }
      if (style === "dots") {
        return (
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-muted-foreground/30"
              />
            ))}
          </div>
        );
      }
      return <Separator className="my-6" />;

    case "cta":
      const buttonStyle = (content.style as string) || "primary";
      const variant =
        buttonStyle === "primary"
          ? "default"
          : buttonStyle === "secondary"
          ? "secondary"
          : "outline";

      return (
        <div className="text-center">
          <Button
            variant={variant}
            size="lg"
            className="px-8"
            style={
              buttonStyle === "primary" ? { backgroundColor: ctaColor } : {}
            }
            onClick={onCtaClick}
          >
            {replaceVariables((content.text as string) || "Aceitar", variables)}
          </Button>
        </div>
      );

    default:
      return null;
  }
}
