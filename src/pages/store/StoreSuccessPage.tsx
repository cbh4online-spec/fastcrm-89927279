import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";

export default function StoreSuccessPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const wsSlug = workspaceSlug || "";

  return (
    <>
      <Helmet>
        <title>Compra Confirmada | Loja</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-20 text-center max-w-lg">
          <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Compra Confirmada!</h1>
          <p className="text-muted-foreground mb-2">
            Obrigado pela sua compra. Receberá um email com os detalhes da encomenda.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Se tiver alguma dúvida, entre em contacto connosco.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/store/${wsSlug}`}>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Package className="h-4 w-4" />
                Continuar a Comprar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
