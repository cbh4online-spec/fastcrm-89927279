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
  Sparkles,
  LayoutPanelLeft,
  ShoppingBag,
  Quote,
  Clock,
  Menu,
  Play,
  Crown,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
  Sparkles,
  LayoutPanelLeft,
  ShoppingBag,
  Quote,
  Clock,
  Menu,
  Play,
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
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-semibold text-sm">Elementos</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arrasta ou clica para adicionar
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-5">
          {ELEMENT_CATEGORIES.map((category) => (
            <div key={category.id}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category.name}
                </h4>
                {category.id === 'premium' && (
                  <Crown className="h-3 w-3 text-amber-500" />
                )}
              </div>
              
              <div className="space-y-1.5">
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
                        "flex items-center gap-3 p-2.5 rounded-lg border",
                        "bg-card hover:bg-accent cursor-grab active:cursor-grabbing",
                        "transition-all duration-150 select-none group",
                        "hover:border-primary/30 hover:shadow-sm",
                        element.premium && "border-amber-200/50 bg-gradient-to-r from-amber-50/50 to-transparent"
                      )}
                      title={element.description}
                    >
                      <div 
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          element.premium 
                            ? "bg-gradient-to-br from-amber-100 to-orange-50 text-amber-600" 
                            : "bg-muted group-hover:bg-primary/10"
                        )}
                        style={{ 
                          backgroundColor: !element.premium ? `${category.color}15` : undefined,
                          color: !element.premium ? category.color : undefined,
                        }}
                      >
                        {IconComponent && (
                          <IconComponent className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {element.name}
                          </span>
                          {element.premium && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">
                              PRO
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {element.description}
                        </p>
                      </div>
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
