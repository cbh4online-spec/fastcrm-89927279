import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, FileText, MessageSquare, Store, Send, HelpCircle, ShieldAlert, Target, Users } from "lucide-react";

interface Props {
  productId: string;
  /** When true, render an empty-state message instead of returning null when no AI content exists. */
  showEmpty?: boolean;
}

interface ProductContent {
  short_title: string | null;
  seo_title: string | null;
  short_description: string | null;
  long_description: string | null;
  benefits: any;
  usage_instructions: string | null;
  precautions: string | null;
  meta_description: string | null;
  seo_keywords: any;
  catalog_text: string | null;
  proposal_text: string | null;
  whatsapp_text: string | null;
  in_store_text: string | null;
  sensory_experience: string | null;
  olfactory_experience: string | null;
  tags: any;
  generated_by_ai: boolean | null;
}

interface SalesSupport {
  positioning: string | null;
  ideal_customer: string | null;
  sales_arguments: any;
  sensory_arguments: any;
  olfactory_arguments: any;
  how_to_explain: string | null;
  faqs: any;
  objections: any;
  sales_alerts: any;
  do_not_sell_as: any;
  sell_as: any;
  counter_script: string | null;
  whatsapp_script: string | null;
  in_store_script: string | null;
  sales_team_script: string | null;
  internal_notes: string | null;
  generated_by_ai: boolean | null;
}

const asArray = (v: any): any[] => (Array.isArray(v) ? v : []);

function TextBlock({ label, value, icon: Icon }: { label: string; value: string | null; icon?: any }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}

function ListBlock({ label, items, icon: Icon }: { label: string; items: any[]; icon?: any }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <ul className="space-y-1 list-disc list-inside text-sm">
        {items.map((it, i) => (
          <li key={i} className="leading-relaxed">
            {typeof it === "string" ? it : it?.text || it?.label || JSON.stringify(it)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQBlock({ items }: { items: any[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <HelpCircle className="h-3.5 w-3.5" />
        Perguntas Frequentes
      </p>
      <div className="space-y-2">
        {items.map((f, i) => (
          <div key={i} className="text-sm border-l-2 border-muted pl-3 py-1">
            <p className="font-medium">{f?.question || f?.q || "—"}</p>
            <p className="text-muted-foreground mt-0.5">{f?.answer || f?.a || ""}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObjectionBlock({ items }: { items: any[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        Objeções e Respostas
      </p>
      <div className="space-y-2">
        {items.map((o, i) => (
          <div key={i} className="text-sm border-l-2 border-warning/40 pl-3 py-1">
            <p className="font-medium text-warning">{o?.objection || o?.text || "—"}</p>
            {o?.response && <p className="text-muted-foreground mt-0.5">{o.response}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductOCRContentSection({ productId }: Props) {
  const { data: content, isLoading: loadingContent } = useQuery({
    queryKey: ["product-content", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_content")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as ProductContent | null;
    },
  });

  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ["product-sales-support", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_sales_support")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as SalesSupport | null;
    },
  });

  if (loadingContent || loadingSales) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!content && !sales) return null;

  const hasContent = !!content && (
    content.long_description || content.catalog_text || content.proposal_text ||
    content.whatsapp_text || content.in_store_text || content.sensory_experience ||
    content.olfactory_experience || asArray(content.benefits).length > 0
  );
  const hasSales = !!sales && (
    sales.positioning || sales.ideal_customer || sales.how_to_explain ||
    sales.counter_script || sales.whatsapp_script || sales.in_store_script ||
    sales.sales_team_script || sales.internal_notes ||
    asArray(sales.sales_arguments).length > 0 || asArray(sales.faqs).length > 0 ||
    asArray(sales.objections).length > 0
  );

  if (!hasContent && !hasSales) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Conteúdo Comercial e Apoio à Venda
        </h3>
        {(content?.generated_by_ai || sales?.generated_by_ai) && (
          <Badge variant="secondary" className="text-[10px]">Gerado por IA</Badge>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["descricao"]} className="space-y-1">
        {hasContent && (
          <AccordionItem value="descricao">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Descrição & Loja
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <TextBlock label="Título Curto" value={content?.short_title ?? null} />
              <TextBlock label="Descrição Longa" value={content?.long_description ?? null} />
              <ListBlock label="Benefícios" items={asArray(content?.benefits)} />
              <TextBlock label="Modo de Uso" value={content?.usage_instructions ?? null} />
              <TextBlock label="Precauções" value={content?.precautions ?? null} />
              <TextBlock label="Experiência Sensorial" value={content?.sensory_experience ?? null} />
              <TextBlock label="Experiência Olfativa" value={content?.olfactory_experience ?? null} />
            </AccordionContent>
          </AccordionItem>
        )}

        {(content?.catalog_text || content?.proposal_text || content?.whatsapp_text || content?.in_store_text) && (
          <AccordionItem value="canais">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Textos por Canal
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <TextBlock label="Catálogo" value={content?.catalog_text ?? null} icon={FileText} />
              <TextBlock label="Proposta Comercial" value={content?.proposal_text ?? null} icon={FileText} />
              <TextBlock label="WhatsApp" value={content?.whatsapp_text ?? null} icon={MessageSquare} />
              <TextBlock label="Em Loja" value={content?.in_store_text ?? null} icon={Store} />
            </AccordionContent>
          </AccordionItem>
        )}

        {hasSales && (
          <AccordionItem value="argumentario">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" /> Argumentário de Venda
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <TextBlock label="Posicionamento" value={sales?.positioning ?? null} icon={Target} />
              <TextBlock label="Cliente Ideal" value={sales?.ideal_customer ?? null} icon={Users} />
              <TextBlock label="Como Explicar" value={sales?.how_to_explain ?? null} />
              <ListBlock label="Argumentos de Venda" items={asArray(sales?.sales_arguments)} />
              <ListBlock label="Argumentos Sensoriais" items={asArray(sales?.sensory_arguments)} />
              <ListBlock label="Argumentos Olfativos" items={asArray(sales?.olfactory_arguments)} />
              <ListBlock label="Vender como" items={asArray(sales?.sell_as)} />
              <ListBlock label="NÃO vender como" items={asArray(sales?.do_not_sell_as)} />
              <ListBlock label="Alertas de Venda" items={asArray(sales?.sales_alerts)} />
              <FAQBlock items={asArray(sales?.faqs)} />
              <ObjectionBlock items={asArray(sales?.objections)} />
            </AccordionContent>
          </AccordionItem>
        )}

        {(sales?.counter_script || sales?.whatsapp_script || sales?.in_store_script || sales?.sales_team_script) && (
          <AccordionItem value="scripts">
            <AccordionTrigger className="text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Scripts
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <TextBlock label="Balcão" value={sales?.counter_script ?? null} />
              <TextBlock label="WhatsApp" value={sales?.whatsapp_script ?? null} icon={MessageSquare} />
              <TextBlock label="Em Loja" value={sales?.in_store_script ?? null} icon={Store} />
              <TextBlock label="Equipa de Vendas" value={sales?.sales_team_script ?? null} />
              <TextBlock label="Notas Internas" value={sales?.internal_notes ?? null} />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </Card>
  );
}
