import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, ShoppingBag } from "lucide-react";

export default function StoreCancelPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const wsSlug = workspaceSlug || "";

  return (
    <>
      <Helmet>
        <title>Pagamento Cancelado | Loja</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-20 text-center max-w-lg">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Pagamento Cancelado</h1>
          <p className="text-muted-foreground mb-8">
            O seu pagamento foi cancelado. Os produtos continuam no carrinho — pode tentar novamente quando quiser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/store/${wsSlug}/checkout`}>
              <Button className="gap-2 w-full sm:w-auto">
                <ShoppingBag className="h-4 w-4" />
                Voltar ao Checkout
              </Button>
            </Link>
            <Link to={`/store/${wsSlug}`}>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                Voltar à Loja
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
