import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Search, X, Heart, ClipboardList, User, ChevronDown, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type { StoreCategory } from "@/hooks/useStoreProducts";

interface StoreHeaderProps {
  storeName?: string;
  logoUrl?: string;
  onSearch?: (query: string) => void;
  workspaceSlug: string;
  categories?: StoreCategory[];
  onSelectCategory?: (id?: string) => void;
}

export function StoreHeader({ storeName = "Loja", logoUrl, onSearch, workspaceSlug, categories = [], onSelectCategory }: StoreHeaderProps) {
  const { totalItems, setIsOpen } = useStoreCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
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
                    <div className="grid gap-1 p-4 w-[300px]">
                      <button
                        onClick={() => onSelectCategory(undefined)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <Grid3X3 className="h-4 w-4 text-primary" />
                        <span className="font-medium">Todos os Produtos</span>
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => onSelectCategory(cat.id)}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                        >
                          <span className="font-medium">{cat.name}</span>
                          {cat.description && (
                            <span className="text-xs text-muted-foreground ml-auto truncate max-w-[120px]">{cat.description}</span>
                          )}
                        </button>
                      ))}
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
              <motion.form
                key="search"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSearch}
                className="flex items-center gap-2 overflow-hidden"
              >
                <Input
                  placeholder="Pesquisar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-40 sm:w-64 h-9"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="h-9 w-9"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                    onSearch?.("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.form>
            ) : (
              <motion.div key="search-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(true)}>
                  <Search className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

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
