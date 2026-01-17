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

  // Initialize with existing items if provided
  if (initialItems && items.length === 0 && initialItems.length > 0) {
    setItems(initialItems);
  }

  const handleAddProduct = (product: Product) => {
    addItem(product);
    onItemsChange?.([...items, { product, quantity: 1 }]);
  };

  const handleRemoveProduct = (productId: string) => {
    removeItem(productId);
    onItemsChange?.(items.filter((item) => item.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    updateQuantity(productId, quantity);
    onItemsChange?.(
      items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleUpdatePrice = (productId: string, price: number | undefined) => {
    updatePrice(productId, price);
    onItemsChange?.(
      items.map((item) =>
        item.product.id === productId ? { ...item, priceOverride: price } : item
      )
    );
  };

  const handleUpdateDiscount = (productId: string, discount: number | undefined) => {
    updateDiscount(productId, discount);
    onItemsChange?.(
      items.map((item) =>
        item.product.id === productId ? { ...item, discount } : item
      )
    );
  };

  const handleClear = () => {
    clearCart();
    onItemsChange?.([]);
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
