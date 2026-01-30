import { 
  LayoutTemplate, 
  FileText, 
  Mail, 
  Megaphone, 
  ShoppingCart, 
  PartyPopper,
  CalendarCheck,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PREDEFINED_LAYOUTS, type EmailLayout } from '@/types/emailBuilder';

interface LayoutsSidebarProps {
  onSelectLayout: (layout: EmailLayout) => void;
}

const CATEGORY_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string;
  color: string;
}> = {
  blank: { icon: LayoutTemplate, label: 'Básico', color: '#6b7280' },
  newsletter: { icon: Mail, label: 'Newsletter', color: '#3b82f6' },
  promotional: { icon: Megaphone, label: 'Promocional', color: '#ef4444' },
  ecommerce: { icon: ShoppingCart, label: 'E-commerce', color: '#10b981' },
  transactional: { icon: FileText, label: 'Transacional', color: '#8b5cf6' },
  event: { icon: CalendarCheck, label: 'Eventos', color: '#f59e0b' },
};

export function LayoutsSidebar({ onSelectLayout }: LayoutsSidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = Object.keys(CATEGORY_CONFIG);
  const filteredLayouts = selectedCategory
    ? PREDEFINED_LAYOUTS.filter(l => l.category === selectedCategory)
    : PREDEFINED_LAYOUTS;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-semibold text-sm">Templates</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Escolhe um modelo base
        </p>
      </div>
      
      {/* Category filters */}
      <div className="p-3 border-b">
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map((category) => {
            const config = CATEGORY_CONFIG[category];
            const Icon = config.icon;
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setSelectedCategory(category)}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Button>
            );
          })}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredLayouts.map((layout) => {
            const config = CATEGORY_CONFIG[layout.category];
            const Icon = config?.icon || LayoutTemplate;
            const color = config?.color || '#6b7280';
            
            return (
              <div
                key={layout.id}
                onClick={() => onSelectLayout(layout)}
                className={cn(
                  "group relative p-4 rounded-xl border-2 border-transparent",
                  "bg-card hover:border-primary/30 cursor-pointer",
                  "transition-all duration-200 hover:shadow-md"
                )}
              >
                {/* Preview thumbnail */}
                <div className="mb-3 rounded-lg bg-muted/50 p-3 border">
                  <div className="space-y-1.5">
                    {layout.blocks.length === 0 ? (
                      <div className="h-16 flex items-center justify-center">
                        <LayoutTemplate className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    ) : (
                      <>
                        {layout.blocks.slice(0, 4).map((block, i) => (
                          <div 
                            key={i}
                            className="h-2 rounded-full bg-muted-foreground/20"
                            style={{ 
                              width: block.type === 'hero' ? '100%' : 
                                     block.type === 'button' ? '40%' :
                                     block.type === 'image' ? '60%' : '80%',
                              marginLeft: block.styles?.textAlign === 'center' ? 'auto' : 0,
                              marginRight: block.styles?.textAlign === 'center' ? 'auto' : 0,
                            }}
                          />
                        ))}
                        {layout.blocks.length > 4 && (
                          <p className="text-[10px] text-muted-foreground text-center pt-1">
                            +{layout.blocks.length - 4} blocos
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Info */}
                <div className="flex items-start gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium">{layout.name}</h4>
                      {layout.blocks.length > 5 && (
                        <Sparkles className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {layout.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {layout.blocks.length} blocos
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="text-[10px] h-4"
                        style={{ borderColor: color, color }}
                      >
                        {config?.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
