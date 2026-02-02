import { useEffect, useRef } from "react";
import { POSProductSelector } from "./POSProductSelector";
import { ProposalCart, CartItem } from "./ProposalCart";
import { AIProductSuggestions } from "./AIProductSuggestions";
import { useProposalCart } from "@/hooks/useProposalItems";
import type { Product } from "@/types/product";

interface POSProposalBuilderProps {
  opportunityTitle?: string;
  opportunityValue?: number;
  leadName?: string;
  companyName?: string;
  onItemsChange?: (items: CartItem[]) => void;
  initialItems?: CartItem[];
}

export function POSProposalBuilder({
  opportunityTitle,
  opportunityValue,
  leadName,
  companyName,
  onItemsChange,
  initialItems,
}: POSProposalBuilderProps) {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updatePrice,
    updateDiscount,
    clearCart,
    getSelectedProductIds,
    setItems,
  } = useProposalCart();

  // Usar ref para rastrear o hash dos items já inicializados
  const lastInitializedItemsRef = useRef<string | null>(null);

  // Initialize with existing items - verificar por conteúdo, não apenas flag booleana
  useEffect(() => {
    if (!initialItems || initialItems.length === 0) return;
    
    // Criar hash simples dos items para comparação
    const itemsHash = JSON.stringify(
      initialItems.map(i => ({ 
        id: i.product.id, 
        qty: i.quantity,
        price: i.priceOverride,
        discount: i.discount 
      }))
    );
    
    // Só inicializar se for diferente do que já inicializamos
    if (lastInitializedItemsRef.current !== itemsHash) {
      setItems(initialItems);
      lastInitializedItemsRef.current = itemsHash;
    }
  }, [initialItems, setItems]);

  // Sync items to parent when state changes
  useEffect(() => {
    onItemsChange?.(items);
  }, [items, onItemsChange]);

  // Simplified handlers - no need to call onItemsChange manually
  const handleAddProduct = (product: Product) => {
    addItem(product);
  };

  const handleRemoveProduct = (productId: string) => {
    removeItem(productId);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    updateQuantity(productId, quantity);
  };

  const handleUpdatePrice = (productId: string, price: number | undefined) => {
    updatePrice(productId, price);
  };

  const handleUpdateDiscount = (productId: string, discount: number | undefined) => {
    updateDiscount(productId, discount);
  };

  const handleClear = () => {
    clearCart();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full min-h-[500px]">
      {/* Product Selector - Main Area */}
      <div className="lg:col-span-6 flex flex-col min-h-0">
        <POSProductSelector
          selectedProductIds={getSelectedProductIds()}
          onAddProduct={handleAddProduct}
          onRemoveProduct={handleRemoveProduct}
        />
      </div>

      {/* AI Suggestions */}
      <div className="lg:col-span-3 min-h-0">
        <AIProductSuggestions
          opportunityTitle={opportunityTitle}
          opportunityValue={opportunityValue}
          leadName={leadName}
          companyName={companyName}
          existingProductIds={getSelectedProductIds()}
          onAddProduct={handleAddProduct}
        />
      </div>

      {/* Cart */}
      <div className="lg:col-span-3 min-h-0">
        <ProposalCart
          items={items}
          onUpdateQuantity={handleUpdateQuantity}
          onUpdatePrice={handleUpdatePrice}
          onUpdateDiscount={handleUpdateDiscount}
          onRemoveItem={handleRemoveProduct}
          onClear={handleClear}
        />
      </div>
    </div>
  );
}
