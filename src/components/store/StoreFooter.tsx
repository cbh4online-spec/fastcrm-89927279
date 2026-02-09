import { Link } from "react-router-dom";
import { ArrowUp, Shield, CreditCard, Truck, Heart, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreCategory } from "@/hooks/useStoreProducts";

interface StoreFooterProps {
  workspaceSlug: string;
  storeName: string;
  categories?: StoreCategory[];
  footerText?: string | null;
}

export function StoreFooter({ workspaceSlug, storeName, categories = [], footerText }: StoreFooterProps) {
  return (
    <footer className="border-t bg-muted/30">
      {/* Payment bar */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Pagamento 100% Seguro</span>
          <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Visa / Mastercard / MB Way</span>
          <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" /> Entrega Rápida</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-bold text-foreground text-lg mb-3">{storeName}</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Qualidade garantida e entrega sem complicações. A sua satisfação é a nossa prioridade.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">A Sua Conta</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to={`/store/${workspaceSlug}/orders`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Encomendas
                </Link>
              </li>
              <li>
                <Link to={`/store/${workspaceSlug}/wishlist`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Lista de Desejos
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <h4 className="font-semibold text-foreground mb-3">Categorias</h4>
              <ul className="space-y-2 text-muted-foreground">
                {categories.slice(0, 6).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      to={`/store/${workspaceSlug}?category=${cat.id}`}
                      className="hover:text-foreground transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Help */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Ajuda</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li className="hover:text-foreground transition-colors cursor-default">Política de Devoluções</li>
              <li className="hover:text-foreground transition-colors cursor-default">Termos e Condições</li>
              <li className="hover:text-foreground transition-colors cursor-default">Política de Privacidade</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between mt-10 pt-6 border-t text-xs text-muted-foreground">
          <p>{footerText || `© ${new Date().getFullYear()} ${storeName}. Todos os direitos reservados.`}</p>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
