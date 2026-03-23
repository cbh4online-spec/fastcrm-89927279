import { useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductSearchDialog } from "@/components/order-notes/ProductSearchDialog";

interface ProductPickerButtonProps {
  onSelect: (product: { id: string; name: string; price: number }) => void;
  disabled?: boolean;
}

export function ProductPickerButton({ onSelect, disabled }: ProductPickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title="Partilhar produto"
        className="shrink-0"
      >
        <Package className="h-4 w-4" />
      </Button>
      <ProductSearchDialog
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(product) => {
          onSelect({ id: product.id, name: product.name, price: product.price });
        }}
      />
    </>
  );
}
