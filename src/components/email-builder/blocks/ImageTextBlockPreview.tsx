import { Image } from 'lucide-react';
import type { ImageTextBlockContent } from '@/types/emailBuilder';
import { cn } from '@/lib/utils';

interface ImageTextBlockPreviewProps {
  content: ImageTextBlockContent;
  isEditing?: boolean;
}

export function ImageTextBlockPreview({ content, isEditing }: ImageTextBlockPreviewProps) {
  const {
    imageSrc,
    imageAlt,
    imagePosition = 'left',
    imageWidth = '50',
    title,
    text,
    buttonText,
    buttonUrl,
    buttonColor = '#3b82f6',
  } = content;

  const imageWidthPercent = parseInt(imageWidth);
  const textWidthPercent = 100 - imageWidthPercent;

  const ImageComponent = (
    <div
      className="flex-shrink-0"
      style={{ width: `${imageWidthPercent}%` }}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full h-auto rounded-lg object-cover"
        />
      ) : (
        <div className="w-full aspect-[4/3] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
          <div className="text-center">
            <Image className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-2">Adicionar imagem</p>
          </div>
        </div>
      )}
    </div>
  );

  const TextComponent = (
    <div
      className="flex flex-col justify-center"
      style={{ width: `${textWidthPercent}%` }}
    >
      <h2 className="text-xl font-bold mb-3">{title || 'Título'}</h2>
      <p className="text-muted-foreground mb-4">{text || 'Descrição...'}</p>
      {buttonText && (
        <div>
          <a
            href={isEditing ? '#' : buttonUrl || '#'}
            className="inline-block px-6 py-2.5 font-medium text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: buttonColor }}
            onClick={(e) => isEditing && e.preventDefault()}
          >
            {buttonText}
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn(
      "flex gap-6",
      imagePosition === 'right' && 'flex-row-reverse'
    )}>
      {ImageComponent}
      {TextComponent}
    </div>
  );
}
