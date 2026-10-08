import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { businessDaysLabel } from "@/lib/store/sellerInfo";

const PAYMENT_LABELS: Record<string, string> = {
  mbway: "MB WAY",
  multibanco: "Referência Multibanco",
  stripe_card: "Cartão de crédito/débito",
  bank_transfer: "Transferência bancária",
};

/**
 * Condições gerais de venda de bens da loja pública.
 * Separadas dos Termos de Utilização do FastCRM (subscrições SaaS).
 * Mostra apenas dados configurados na loja e obrigações legais gerais;
 * nunca inventa NIF, morada, prazos de entrega ou compromissos comerciais.
 */
export default function StoreTermsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { workspaceId, slug, isLoading } = useResolveStoreWorkspace(workspaceSlug);
  const { data: settings, isLoading: loadingSettings } = usePublicStoreSettings(workspaceId || "");

  if (isLoading || loadingSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const storeName = settings?.store_name || "Loja";
  const vatRate = settings?.vat_rate ?? 23;
  const includeVat = settings?.prices_include_vat ?? true;
  const methods = Object.entries((settings as any)?.payment_methods || {})
    .filter(([, on]) => on === true)
    .map(([k]) => PAYMENT_LABELS[k] || k);
  const st = (settings as any) || {};
  const sellerName: string = st.seller_legal_name || storeName;
  const sellerNif: string | undefined = st.seller_tax_id || undefined;
  const sellerAddress: string | undefined = st.seller_address || undefined;
  const deliveryDays: number | undefined = st.delivery_business_days || undefined;
  const contactEmail: string | undefined = (settings as any)?.notification_email || undefined;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Condições de Venda | ${storeName}`}</title>
        <meta name="description" content={`Condições gerais de venda de produtos na loja ${storeName}.`} />
      </Helmet>
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Link to={`/store/${slug || workspaceSlug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar à loja
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Condições Gerais de Venda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aplicáveis à compra de produtos na loja online {storeName}. Não se aplicam às subscrições do software FastCRM.
        </p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="mb-1 font-semibold">Vendedor e contacto</h2>
            <p>
              Os produtos são vendidos por {sellerName}
              {sellerName !== storeName ? <> (loja {storeName})</> : null}
              {sellerNif ? <>, NIF {sellerNif}</> : null}
              {sellerAddress ? <>, com sede em {sellerAddress}</> : null}.
              {contactEmail ? <> Para questões sobre encomendas, contacte <a className="underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</> : null}
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">Preços</h2>
            <p>
              {includeVat
                ? `Os preços apresentados incluem IVA à taxa em vigor (${vatRate}%).`
                : `Os preços apresentados não incluem IVA; acresce IVA à taxa em vigor (${vatRate}%).`}{" "}
              O preço aplicável é o apresentado no momento da encomenda. Eventuais custos de envio são indicados antes da confirmação.
            </p>
          </section>

          {deliveryDays && (
            <section>
              <h2 className="mb-1 font-semibold">Entrega</h2>
              <p>
                O prazo de entrega indicado é de {businessDaysLabel(deliveryDays)}. O método de envio, o respetivo
                custo e a estimativa de cada transportadora são apresentados no checkout antes da confirmação.
              </p>
            </section>
          )}

          {methods.length > 0 && (
            <section>
              <h2 className="mb-1 font-semibold">Pagamento</h2>
              <p>Meios de pagamento disponíveis: {methods.join(", ")}.</p>
            </section>
          )}

          <section>
            <h2 className="mb-1 font-semibold">Direito de livre resolução</h2>
            <p>
              O consumidor pode resolver o contrato celebrado à distância no prazo de 14 dias a contar da receção dos bens, sem indicar motivo, nos termos do Decreto-Lei n.º 24/2014.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">Garantia</h2>
            <p>Os bens de consumo beneficiam da garantia legal de conformidade de 3 anos, nos termos do Decreto-Lei n.º 84/2021.</p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold">Reclamações e litígios</h2>
            <p>
              Pode apresentar reclamação no{" "}
              <a className="underline" href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">Livro de Reclamações Eletrónico</a>.
              Em caso de litígio de consumo, pode recorrer a uma entidade de Resolução Alternativa de Litígios de Consumo (Lei n.º 144/2015), cuja lista está disponível em{" "}
              <a className="underline" href="https://www.consumidor.gov.pt/parceiros/sistema-de-defesa-do-consumidor/entidades-de-resolucao-alternativa-de-litigios-de-consumo" target="_blank" rel="noopener noreferrer">consumidor.gov.pt</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
