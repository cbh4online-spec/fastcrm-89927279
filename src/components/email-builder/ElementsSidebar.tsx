import { 
  Type, 
  Image, 
  MousePointer, 
  Minus, 
  Square, 
  Columns, 
  Share2, 
  FileText, 
  Code,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ELEMENT_CATEGORIES, type EmailBlockType } from '@/types/emailBuilder';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Type,
  Image,
  MousePointer,
  Minus,
  Square,
  Columns,
  Share2,
  FileText,
  Code,
};

interface ElementsSidebarProps {
  onDragStart: (type: EmailBlockType) => void;
  onDragEnd: () => void;
  onElementClick: (type: EmailBlockType) => void;
}

export function ElementsSidebar({ 
  onDragStart, 
  onDragEnd, 
  onElementClick,
}: ElementsSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Elementos</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arrasta ou clica para adicionar
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {ELEMENT_CATEGORIES.map((category) => (
            <div key={category.id}>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {category.name}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {category.elements.map((element) => {
                  const IconComponent = ICON_MAP[element.icon];
                  
                  return (
                    <div
                      key={element.type}
                      draggable
                      onDragStart={() => onDragStart(element.type)}
                      onDragEnd={onDragEnd}
                      onClick={() => onElementClick(element.type)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border",
                        "bg-card hover:bg-accent hover:border-primary/50 cursor-grab active:cursor-grabbing",
                        "transition-all duration-150 select-none"
                      )}
                      title={element.description}
                    >
                      {IconComponent && (
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-center">
                        {element.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
