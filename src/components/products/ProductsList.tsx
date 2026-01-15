import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Archive,
  RotateCcw,
  Package,
  Loader2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useProducts, useProductCategories, useArchiveProduct } from "@/hooks/useProducts";
import { CreateProductDialog } from "./CreateProductDialog";
import { ProductDetailDialog } from "./ProductDetailDialog";
import {
  productTypeLabels,
  productStatusLabels,
  billingTypeLabels,
  type Product,
} from "@/types/product";

export function ProductsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const { data: products, isLoading } = useProducts({
    status: statusFilter,
    productType: typeFilter,
    category: categoryFilter,
    search: search || undefined,
  });

  const { data: categories } = useProductCategories();
  const archiveProduct = useArchiveProduct();

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  const handleArchive = async (product: Product) => {
    await archiveProduct.mutateAsync({
      id: product.id,
      archive: product.status === "active",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os seus produtos e serviços
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Produto
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="archived">Arquivados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="simple">Simples</SelectItem>
            <SelectItem value="recurring">Recorrente</SelectItem>
            <SelectItem value="composite">Bundle</SelectItem>
            <SelectItem value="sessions">Sessões</SelectItem>
          </SelectContent>
        </Select>

        {categories && categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : !products?.length ? (
          <div className="p-12 text-center text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-medium mb-2">Ainda não tens produtos.</h3>
            <p className="text-sm mb-4">
              Cria o primeiro produto para usares em propostas e negócios.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Produto
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Cobrança</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      {product.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {productTypeLabels[product.product_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{product.category || "-"}</TableCell>
                  <TableCell>
                    {formatCurrency(product.base_price, product.currency)}
                  </TableCell>
                  <TableCell>{billingTypeLabels[product.billing_type]}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.status === "active" ? "default" : "secondary"}
                    >
                      {productStatusLabels[product.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(product.updated_at), "dd/MM/yyyy", {
                      locale: pt,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailProduct(product)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditProduct(product)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(product)}>
                          {product.status === "active" ? (
                            <>
                              <Archive className="h-4 w-4 mr-2" />
                              Arquivar
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reativar
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <CreateProductDialog
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
        product={editProduct ?? undefined}
      />

      {detailProduct && (
        <ProductDetailDialog
          open={!!detailProduct}
          onOpenChange={(open) => !open && setDetailProduct(null)}
          productId={detailProduct.id}
        />
      )}
    </div>
  );
}
