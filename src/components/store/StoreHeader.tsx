import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, Search, Menu, X, Heart, ClipboardList, User } from "lucide-react";
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

interface StoreHeaderProps {
  storeName?: string;
  logoUrl?: string;
  onSearch?: (query: string) => void;
  workspaceSlug: string;
}

export function StoreHeader({ storeName = "Loja", logoUrl, onSearch, workspaceSlug }: StoreHeaderProps) {
  const { totalItems, setIsOpen } = useStoreCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          to={`/store/${workspaceSlug}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {logoUrl && (
            <img src={logoUrl} alt={storeName} className="h-8 w-8 object-contain rounded" />
          )}
          <span className="text-xl font-bold tracking-tight">{storeName}</span>
        </Link>

        <div className="flex items-center gap-3">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                placeholder="Pesquisar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 md:w-64"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                  onSearch?.("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
            className="relative"
            onClick={() => setIsOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {totalItems}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
