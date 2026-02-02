
# Plano: Adicionar Imagem ao ProductCard com Funcionalidade de Zoom

## Objectivo

Adicionar uma miniatura de imagem perceptível em cada card de produto no selector POS, com a possibilidade de fazer zoom/ampliar para confirmar visualmente o produto.

## Análise Técnica

### Dados Já Disponíveis

O hook `useProducts` já carrega todos os campos necessários:
- `images: string[]` - Array de URLs de imagens
- `primary_image_index: number | null` - Índice da imagem principal

Não é necessário fazer queries adicionais!

### Componentes Existentes

| Componente | Uso |
|------------|-----|
| `HoverCard` | Radix UI - Para mostrar imagem ampliada no hover |
| `Dialog` | Radix UI - Para modal de zoom em mobile/click |
| `AspectRatio` | Radix UI - Para manter proporção da imagem |

## Solução Proposta

### Layout do ProductCard Actualizado

```text
┌─────────────────────────────────────────┐
│  ┌──────┐  📦 Categoria              │ ← Badge
│  │      │                              │
│  │  📷  │  Nome do Produto           │ ← Imagem + Info
│  │      │                              │
│  └──────┘  € 150,00         /hora    │ ← Preço
│                                        │
│  [-] 2 [+]                 ✓         │ ← Controlos (se selecionado)
└─────────────────────────────────────────┘
```

### Interacção de Zoom

**Desktop (hover)**:
- Ao passar o rato sobre a miniatura, mostra HoverCard com imagem ampliada
- Animação suave de entrada/saída

**Mobile/Click**:
- Ao clicar na miniatura, abre Dialog com imagem em tamanho grande
- Botão de fechar ou clicar fora para sair

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/proposals/ProductCard.tsx` | Adicionar miniatura com HoverCard e Dialog para zoom |

## Implementação Detalhada

### ProductCard.tsx

```typescript
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// ...existing code...

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  ({ product, isSelected, quantity = 0, onClick, onIncrement, onDecrement }, ref) => {
    const [zoomOpen, setZoomOpen] = useState(false);
    
    // Get primary image URL
    const primaryImageUrl = product.images?.length > 0
      ? product.images[product.primary_image_index ?? 0]
      : null;

    const Icon = getIcon(product.product_type);
    const colorClass = productTypeColors[product.product_type] || "bg-muted text-muted-foreground";

    // Thumbnail component with hover preview
    const ImageThumbnail = () => (
      <div 
        className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-zoom-in"
        onClick={(e) => {
          e.stopPropagation();
          setZoomOpen(true);
        }}
      >
        {primaryImageUrl ? (
          <img
            src={primaryImageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>
    );

    return (
      <>
        {/* Dialog for mobile/click zoom */}
        <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
          <DialogContent className="max-w-md p-2">
            <AspectRatio ratio={4/3}>
              {primaryImageUrl ? (
                <img
                  src={primaryImageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </AspectRatio>
            <p className="text-center font-medium mt-2">{product.name}</p>
          </DialogContent>
        </Dialog>

        <Card ref={ref} onClick={onClick} className={...}>
          {/* Selection badge */}
          {isSelected && ...}
          
          <div className="flex gap-3">
            {/* Image with HoverCard for desktop preview */}
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div>
                  <ImageThumbnail />
                </div>
              </HoverCardTrigger>
              <HoverCardContent 
                side="right" 
                className="w-64 p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <AspectRatio ratio={4/3}>
                  {primaryImageUrl ? (
                    <img
                      src={primaryImageUrl}
                      alt={product.name}
                      className="w-full h-full object-contain rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded">
                      <Package className="h-12 w-12 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-2">Sem imagem</span>
                    </div>
                  )}
                </AspectRatio>
                <p className="text-sm font-medium text-center mt-2">{product.name}</p>
                {product.sku && (
                  <p className="text-xs text-muted-foreground text-center">SKU: {product.sku}</p>
                )}
              </HoverCardContent>
            </HoverCard>

            {/* Product info */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* Category badge */}
              <div className="flex items-start justify-between mb-1">
                <div className={cn("p-1 rounded", colorClass)}>
                  <Icon className="h-3 w-3" />
                </div>
                {product.category && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {product.category}
                  </Badge>
                )}
              </div>

              {/* Name */}
              <h4 className="font-medium text-sm line-clamp-2">
                {product.name}
              </h4>

              {/* Price */}
              <div className="flex items-baseline justify-between mt-auto">
                <span className="text-sm font-bold text-primary">
                  {formatPrice(product.base_price)}
                </span>
                {product.billing_type === "recurring" && (
                  <span className="text-[10px] text-muted-foreground">/mês</span>
                )}
              </div>
            </div>
          </div>

          {/* Quantity controls */}
          {isSelected && (
            <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t">
              ...
            </div>
          )}
        </Card>
      </>
    );
  }
);
```

## Fluxo de UX

**Desktop:**
1. Utilizador vê miniatura de 48x48px no card
2. Ao passar o rato (hover), aparece HoverCard à direita com imagem 256px
3. Ao clicar na miniatura, abre Dialog fullscreen para zoom máximo

**Mobile:**
1. Utilizador vê miniatura de 48x48px no card
2. Ao tocar na miniatura, abre Dialog com imagem grande
3. Toca fora para fechar

**Sem Imagem:**
1. Mostra ícone do tipo de produto como fallback
2. HoverCard mostra "Sem imagem" com ícone
3. Dialog mostra ícone grande centrado

## Benefícios

1. **Identificação Visual** - Confirmar produto rapidamente pela imagem
2. **Zoom Flexível** - Hover para preview, click para fullscreen
3. **Performance** - Usa dados já carregados, sem queries extra
4. **Fallback Elegante** - Ícone do tipo quando não há imagem
5. **Responsive** - Funciona em desktop e mobile

## Complexidade

Baixa - Modificar apenas 1 ficheiro com componentes já existentes.
