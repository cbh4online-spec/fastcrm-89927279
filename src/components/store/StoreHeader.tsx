import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Search, X, Heart, ClipboardList, User, ChevronDown, Grid3X3, TrendingUp, ArrowRight, Star, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoreSearchAutocomplete } from "@/components/store/StoreSearchAutocomplete";
import { StoreLoyaltyWidget } from "@/components/store/StoreLoyaltyWidget";
import { useStoreCart } from "@/contexts/StoreCartContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import type { StoreCategory, StoreProduct } from "@/hooks/useStoreProducts";

interface StoreHeaderProps {
  storeName?: string;
  logoUrl?: string;
  onSearch?: (query: string) => void;
  workspaceSlug: string;
  categories?: StoreCategory[];
  onSelectCategory?: (id?: string) => void;
  products?: StoreProduct[];
}

export function StoreHeader({ storeName = "Loja", logoUrl, onSearch, workspaceSlug, categories = [], onSelectCategory, products = [] }: StoreHeaderProps) {
  const { totalItems, setIsOpen } = useStoreCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);

  // Find a suggested product for the hovered category
  const suggestedProduct = useMemo(() => {
    if (!hoveredCategoryId || products.length === 0) return null;
    // Prefer featured, then first match
    const categoryProducts = products.filter(p => p.store_category_id === hoveredCategoryId);
    return categoryProducts.find(p => p.store_featured) || categoryProducts[0] || null;
  }, [hoveredCategoryId, products]);

  // Count products per category
  const productCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach(p => {
      if (p.store_category_id) {
        counts.set(p.store_category_id, (counts.get(p.store_category_id) || 0) + 1);
      }
    });
    return counts;
  }, [products]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(price);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link
            to={`/store/${workspaceSlug}`}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            {logoUrl && (
              <img src={logoUrl} alt={storeName} className="h-8 w-8 object-contain rounded" />
            )}
            <span className="text-xl font-bold tracking-tight">{storeName}</span>
          </Link>

          {/* Mega Menu - Categories */}
          {categories.length > 0 && onSelectCategory && (
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="h-9 gap-1 text-sm">
                    <Grid3X3 className="h-4 w-4" />
                    Categorias
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="flex w-[500px]">
                      {/* Left column: Category list */}
                      <div className="flex-1 p-4 space-y-1 border-r">
                        <button
                          onClick={() => onSelectCategory(undefined)}
                          onMouseEnter={() => setHoveredCategoryId(null)}
                          className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left w-full"
                        >
                          <Grid3X3 className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium">Todos os Produtos</span>
                          <span className="ml-auto text-xs text-muted-foreground">{products.length}</span>
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            onMouseEnter={() => setHoveredCategoryId(cat.id)}
                            className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors text-left w-full ${
                              hoveredCategoryId === cat.id ? "bg-muted" : "hover:bg-muted"
                            }`}
                          >
                            {cat.image_url ? (
                              <img src={cat.image_url} alt={cat.name} className="h-6 w-6 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">{cat.name.charAt(0)}</span>
                              </div>
                            )}
                            <span className="font-medium">{cat.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {productCountByCategory.get(cat.id) || 0}
                            </span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            onSelectCategory(undefined);
                            document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-primary hover:underline mt-1"
                        >
                          Ver Todo o Catálogo
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Right column: Suggested product */}
                      <div className="w-[200px] p-4 flex flex-col items-center justify-center">
                        {suggestedProduct ? (
                          <Link
                            to={`/store/${workspaceSlug}/product/${suggestedProduct.id}`}
                            className="group text-center space-y-2"
                          >
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-muted">
                              {suggestedProduct.images?.[0] ? (
                                <img
                                  src={suggestedProduct.images[0]}
                                  alt={suggestedProduct.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                              )}
                              {suggestedProduct.store_featured && (
                                <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                  Destaque
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                              {suggestedProduct.name}
                            </p>
                            <p className="text-sm font-bold text-primary">
                              {formatPrice(suggestedProduct.base_price, suggestedProduct.currency)}
                            </p>
                          </Link>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Passe o rato sobre uma categoria</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <AnimatePresence mode="wait">
            {searchOpen ? (
              <motion.div
                key="search"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-visible"
              >
                <StoreSearchAutocomplete
                  workspaceSlug={workspaceSlug}
                  onSearch={(q) => {
                    onSearch?.(q);
                  }}
                  onClose={() => {
                    setSearchOpen(false);
                    onSearch?.("");
                  }}
                />
              </motion.div>
            ) : (
              <motion.div key="search-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(true)}>
                  <Search className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loyalty Points Badge */}
          <StoreLoyaltyWidget
            workspaceId={workspaceSlug}
            workspaceSlug={workspaceSlug}
            compact
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to={`/store/${workspaceSlug}/wishlist`} className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Lista de Desejos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/store/${workspaceSlug}/orders`} className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  As Minhas Encomendas
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/store/${workspaceSlug}/loyalty`} className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Pontos de Fidelidade
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/store/${workspaceSlug}/referrals`} className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Referrals
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/store/${workspaceSlug}/gift-cards`} className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Cartões Presente
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => setIsOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            <AnimatePresence>
              {totalItems > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                    {totalItems}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </header>
  );
}
