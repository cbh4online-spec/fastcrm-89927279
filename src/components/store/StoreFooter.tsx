import { Link } from "react-router-dom";
import { ArrowUp, Shield, CreditCard, Truck, Heart, ClipboardList, Lock, RotateCcw, BadgeCheck, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { StoreCategory } from "@/hooks/useStoreProducts";

interface StoreFooterProps {
  workspaceSlug: string;
  storeName: string;
  categories?: StoreCategory[];
  footerText?: string | null;
  pricesIncludeVat?: boolean;
  vatRate?: number;
}

export function StoreFooter({ workspaceSlug, storeName, categories = [], footerText, pricesIncludeVat = true, vatRate = 23 }: StoreFooterProps) {
  return (
    <footer className="border-t bg-muted/30 mt-16">
      {/* Trust & Payment bar */}
      <div className="bg-muted/60 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Pagamento Seguro</p>
                <p className="text-[11px] text-muted-foreground">Encriptação SSL 256-bit</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Entrega Rápida</p>
                <p className="text-[11px] text-muted-foreground">Receba em 3-5 dias úteis</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Devoluções Fáceis</p>
                <p className="text-[11px] text-muted-foreground">14 dias para devolver</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BadgeCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Garantia de Qualidade</p>
                <p className="text-[11px] text-muted-foreground">Satisfação garantida</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Métodos de pagamento:</span>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-background border text-[11px] font-semibold tracking-wider">VISA</span>
            <span className="px-2.5 py-1 rounded bg-background border text-[11px] font-semibold tracking-wider">MASTERCARD</span>
            <span className="px-2.5 py-1 rounded bg-background border text-[11px] font-semibold tracking-wider">MB WAY</span>
            <span className="px-2.5 py-1 rounded bg-background border text-[11px] font-semibold tracking-wider">MULTIBANCO</span>
          </div>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Lock className="h-3 w-3" /> SSL Seguro
          </span>
        </div>
      </div>

      {/* Main footer content */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-bold text-foreground text-lg mb-3">{storeName}</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Qualidade garantida e entrega sem complicações. A sua satisfação é a nossa prioridade.
            </p>
          </div>

          {/* Account Links */}
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
              <li>
                <Link to={`/store/${workspaceSlug}/loyalty`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  Pontos de Fidelidade
                </Link>
              </li>
              <li>
                <Link to={`/store/${workspaceSlug}/referrals`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Referrals
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

          {/* Legal & Help */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Informação Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Termos e Condições
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-foreground transition-colors">
                  Política de Cookies
                </Link>
              </li>
              <li>
                <Link to="/gdpr" className="hover:text-foreground transition-colors">
                  RGPD
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-[11px] text-muted-foreground text-center mb-4">
          {pricesIncludeVat
            ? `Todos os preços apresentados incluem IVA à taxa legal em vigor (${vatRate}%).`
            : `Todos os preços apresentados não incluem IVA. Acresce IVA à taxa legal em vigor (${vatRate}%).`}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>{footerText || `© ${new Date().getFullYear()} ${storeName}. Todos os direitos reservados.`}</p>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Voltar ao topo"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
