import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Package, Star, ArrowUp, ArrowDown, Loader2, Pencil, ImageIcon, Layers, PackageCheck } from "lucide-react";
import type { ProductStoreData } from "./useStoreAdminProducts";

interface CatalogProductsTableProps {
  products: ProductStoreData[];
  isLoading: boolean;
  onTogglePublish: (id: string, current: boolean) => void;
  onToggleFeatured: (id: string, current: boolean) => void;
  onMoveOrder: (id: string, currentOrder: number | null, direction: "up" | "down") => void;
  onEdit: (productId: string) => void;
}

export function CatalogProductsTable({ products, isLoading, onTogglePublish, onToggleFeatured, onMoveOrder, onEdit }: CatalogProductsTableProps) {
  const navigate = useNavigate();
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14" />
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-center">Publicado</TableHead>
            <TableHead className="text-center">Destaque</TableHead>
            <TableHead className="text-center">Ordem</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
          ) : products.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sem produtos ativos</TableCell></TableRow>
          ) : (
            products.map((product) => {
              const imgIdx = product.primary_image_index ?? 0;
              const img = product.images?.[imgIdx] || product.images?.[0];
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden">
                      {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : (
                        <div className="h-full w-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/30" /></div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-1.5">
                        {product.brand_logo_url && <img src={product.brand_logo_url} alt="" className="h-4 object-contain flex-shrink-0" />}
                        <button onClick={() => onEdit(product.id)} className="font-medium text-sm hover:underline text-left cursor-pointer">{product.name}</button>
                      </div>
                      {product.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{product.category || "—"}</TableCell>
                  <TableCell className="text-right font-medium text-sm">€{product.base_price.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={product.store_published} onCheckedChange={() => onTogglePublish(product.id, product.store_published)} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant={product.store_featured ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => onToggleFeatured(product.id, product.store_featured)} disabled={!product.store_published}>
                      <Star className={`h-4 w-4 ${product.store_featured ? "fill-current" : ""}`} />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveOrder(product.id, product.store_sort_order, "up")}><ArrowUp className="h-3 w-3" /></Button>
                      <span className="text-xs text-muted-foreground w-6 text-center">{product.store_sort_order ?? "—"}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMoveOrder(product.id, product.store_sort_order, "down")}><ArrowDown className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(product.id)} title="Editar produto"><Pencil className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
