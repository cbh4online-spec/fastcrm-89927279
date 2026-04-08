import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, Search, Package, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProducts } from '@/hooks/useProducts';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { ProductBlockContent } from '@/types/emailBuilder';
import type { Product } from '@/types/product';

interface ProductBlockEditorProps {
  content: ProductBlockContent;
  onUpdate: (updates: Partial<ProductBlockContent>) => void;
  onOpenImageUploader?: () => void;
}

function getProductImage(product: Product): string {
  if (product.images && product.images.length > 0) {
    const idx = product.primary_image_index ?? 0;
    return product.images[idx] || product.images[0] || '';
  }
  return '';
}

function formatPrice(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
  }).format(value);
}

export function ProductBlockEditor({ content, onUpdate, onOpenImageUploader }: ProductBlockEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { currentWorkspace } = useWorkspace();
  const { data: products, isLoading } = useProducts({ status: 'active' });

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products.slice(0, 30);
    const q = search.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [products, search]);

  const handleSelectProduct = (product: Product) => {
    const slug = currentWorkspace?.slug;
    const storeUrl = slug
      ? `${window.location.origin}/store/${slug}/product/${product.id}`
      : '';

    onUpdate({
      imageSrc: getProductImage(product),
      imageAlt: product.name,
      name: product.name,
      description: product.short_description || product.commercial_description || '',
      price: formatPrice(product.base_price, product.currency),
      buttonUrl: storeUrl,
    });
    setPickerOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-4">
      {/* Product Picker */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Selecionar Produto do Catálogo
        </Label>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start gap-2 text-sm">
              <Package className="h-4 w-4 text-primary" />
              <span className="truncate">
                {content.name || 'Escolher produto...'}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar produto..."
                  className="pl-8 h-9 text-sm"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="max-h-64">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  A carregar...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((product) => {
                    const img = getProductImage(product);
                    const isSelected = content.name === product.name;
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover border flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(product.base_price, product.currency)}
                            {product.category && ` · ${product.category}`}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
        <p className="text-[10px] text-muted-foreground">
          Seleciona um produto para preencher automaticamente os campos abaixo.
        </p>
      </div>

      <div className="border-t pt-4" />

      {onOpenImageUploader && (
        <Button variant="outline" className="w-full" onClick={onOpenImageUploader}>
          <Upload className="h-4 w-4 mr-2" />
          Imagem do Produto
        </Button>
      )}

      <div className="space-y-2">
        <Label className="text-xs">URL da Imagem</Label>
        <Input
          value={content.imageSrc}
          onChange={(e) => onUpdate({ imageSrc: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Nome do Produto</Label>
        <Input
          value={content.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Nome do produto"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Descrição</Label>
        <Textarea
          value={content.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Descrição do produto"
          className="min-h-[80px] text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Preço Atual</Label>
          <Input
            value={content.price}
            onChange={(e) => onUpdate({ price: e.target.value })}
            placeholder="€49,99"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Preço Original</Label>
          <Input
            value={content.originalPrice || ''}
            onChange={(e) => onUpdate({ originalPrice: e.target.value })}
            placeholder="€79,99"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Badge/Etiqueta</Label>
        <Input
          value={content.badge || ''}
          onChange={(e) => onUpdate({ badge: e.target.value })}
          placeholder="OFERTA, NOVO, -30%"
        />
      </div>

      <div className="pt-4 border-t space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Botão
        </h4>

        <div className="space-y-2">
          <Label className="text-xs">Texto do Botão</Label>
          <Input
            value={content.buttonText}
            onChange={(e) => onUpdate({ buttonText: e.target.value })}
            placeholder="Comprar Agora"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">URL do Botão</Label>
          <Input
            value={content.buttonUrl}
            onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Cor do Botão</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={content.buttonColor || '#10b981'}
              onChange={(e) => onUpdate({ buttonColor: e.target.value })}
              className="w-12 h-9 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={content.buttonColor || '#10b981'}
              onChange={(e) => onUpdate({ buttonColor: e.target.value })}
              className="flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
