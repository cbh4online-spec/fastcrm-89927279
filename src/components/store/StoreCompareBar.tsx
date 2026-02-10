import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, GitCompareArrows, Trash2 } from "lucide-react";
import { useStoreCompare } from "@/contexts/StoreCompareContext";
import { cn } from "@/lib/utils";

export function StoreCompareBar() {
  const { items, removeItem, clearAll, setIsOpen } = useStoreCompare();

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md shadow-2xl"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Product thumbnails */}
            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
              {items.map((product) => {
                const imageUrl = product.images?.[product.primary_image_index ?? 0] || product.images?.[0];
                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 flex-shrink-0"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-10 h-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted" />
                    )}
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {product.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => removeItem(product.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}

              {/* Empty slots */}
              {Array.from({ length: 3 - items.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-[160px] h-14 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center flex-shrink-0"
                >
                  <span className="text-xs text-muted-foreground">
                    + Adicionar
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(true)}
                disabled={items.length < 2}
                className="gap-1.5"
              >
                <GitCompareArrows className="h-4 w-4" />
                Comparar ({items.length})
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
