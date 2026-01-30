import type { MenuBlockContent } from '@/types/emailBuilder';
import { cn } from '@/lib/utils';

interface MenuBlockPreviewProps {
  content: MenuBlockContent;
  isEditing?: boolean;
}

export function MenuBlockPreview({ content, isEditing }: MenuBlockPreviewProps) {
  const {
    items = [],
    separator = '|',
    alignment = 'center',
  } = content;

  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>Adiciona itens ao menu</p>
      </div>
    );
  }

  return (
    <nav className={cn("flex flex-wrap items-center gap-2", alignmentClasses[alignment])}>
      {items.map((item, index) => (
        <span key={index} className="flex items-center">
          <a
            href={isEditing ? '#' : item.url || '#'}
            className="text-primary hover:underline"
            onClick={(e) => isEditing && e.preventDefault()}
          >
            {item.text}
          </a>
          {index < items.length - 1 && (
            <span className="mx-3 text-muted-foreground">{separator}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
