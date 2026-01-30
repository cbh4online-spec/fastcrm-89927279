import { ShoppingBag } from 'lucide-react';
import type { ProductBlockContent } from '@/types/emailBuilder';

interface ProductBlockPreviewProps {
  content: ProductBlockContent;
  isEditing?: boolean;
}

export function ProductBlockPreview({ content, isEditing }: ProductBlockPreviewProps) {
  const {
    imageSrc,
    imageAlt,
    name,
    description,
    price,
    originalPrice,
    badge,
    buttonText,
    buttonUrl,
    buttonColor = '#10b981',
  } = content;

  return (
    <div className="flex flex-col items-center text-center">
      {/* Badge */}
      {badge && (
        <div className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
          {badge}
        </div>
      )}

      {/* Image */}
      <div className="w-full mb-4">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAlt}
            className="w-full h-48 object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
            <div className="text-center">
              <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mt-2">Imagem do produto</p>
            </div>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg font-bold mb-1">{name || 'Nome do Produto'}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{description}</p>
      )}

      {/* Price */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl font-bold text-primary">{price || '€0,00'}</span>
        {originalPrice && (
          <span className="text-lg text-muted-foreground line-through">{originalPrice}</span>
        )}
      </div>

      {/* Button */}
      <a
        href={isEditing ? '#' : buttonUrl || '#'}
        className="w-full py-3 px-6 font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
        style={{ backgroundColor: buttonColor }}
        onClick={(e) => isEditing && e.preventDefault()}
      >
        {buttonText || 'Comprar'}
      </a>
    </div>
  );
}
