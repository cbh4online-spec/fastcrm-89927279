import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Quote, Calendar, CreditCard, FileText, User, MapPin } from "lucide-react";
import type { ContentBlock } from "@/types/proposal";
import { format, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Interface for proposal items
export interface PreviewItem {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string | null;
}

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
  items?: PreviewItem[];
  // Client info
  clientName?: string | null;
  clientNif?: string | null;
  clientAddress?: string | null;
  // Conditions
  paymentConditions?: string | null;
  validityDays?: number | null;
  notes?: string | null;
  createdAt?: string | null;
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

// Format currency - default to EUR for Portugal
function formatCurrency(value: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("pt-PT", {
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
  currency = "EUR",
  showCta = true,
  onCtaClick,
  items = [],
  clientName,
  clientNif,
  clientAddress,
  paymentConditions,
  validityDays,
  notes,
  createdAt,
}: ProposalPreviewProps) {
  // Calculate items total
  const itemsTotal = items.reduce((sum, item) => sum + item.total_price, 0);
  
  // Calculate expiry date
  const expiryDate = createdAt && validityDays 
    ? addDays(new Date(createdAt), validityDays)
    : null;
  return (
    <div className="mx-auto bg-background border rounded-lg shadow-lg overflow-hidden max-w-4xl">
        {/* Header */}
        <div className="bg-primary/5 p-6 md:p-10">
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {replaceVariables(title, variables)}
            </h1>
            {price && (
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {formatCurrency(price, currency)}
              </Badge>
            )}
          </div>
          
          {/* Client Info Card */}
          {(clientName || clientNif || createdAt) && (
            <div className="bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border/50 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientName && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Para</p>
                      <p className="font-medium">{clientName}</p>
                      {clientNif && <p className="text-sm text-muted-foreground">NIF: {clientNif}</p>}
                    </div>
                  </div>
                )}
                {clientAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Morada</p>
                      <p className="text-sm">{clientAddress}</p>
                    </div>
                  </div>
                )}
                {createdAt && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Data</p>
                      <p className="text-sm">
                        {format(new Date(createdAt), "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                      </p>
                    </div>
                  </div>
                )}
                {expiryDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Válida até</p>
                      <p className="text-sm font-medium text-primary">
                        {format(expiryDate, "dd 'de' MMMM 'de' yyyy", { locale: pt })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

        {/* Items Table Section */}
        {items.length > 0 && (
          <Card className="overflow-hidden">
            <div className="bg-primary/5 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Produtos e Serviços</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50%]">Descrição</TableHead>
                  <TableHead className="text-center w-[10%]">Qtd.</TableHead>
                  <TableHead className="text-right w-[20%]">Preço Unit.</TableHead>
                  <TableHead className="text-right w-[20%]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price, currency)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.total_price, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary text-lg">
                    {formatCurrency(itemsTotal, currency)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        )}

        {/* Conditions Section */}
        {(paymentConditions || notes) && (
          <Card className="overflow-hidden mx-6 md:mx-10 mb-6">
            <div className="bg-muted/50 px-6 py-4 border-b">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Condições
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {paymentConditions && (
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Pagamento</p>
                    <p className="font-medium">{paymentConditions}</p>
                  </div>
                </div>
              )}
              {notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>
          </Card>
        )}

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
