import { LayoutTemplate, FileText, Mail, Megaphone } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { PREDEFINED_LAYOUTS, type EmailLayout } from '@/types/emailBuilder';

interface LayoutsSidebarProps {
  onSelectLayout: (layout: EmailLayout) => void;
}

const LAYOUT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  blank: LayoutTemplate,
  'simple-text': FileText,
  newsletter: Mail,
  promotional: Megaphone,
};

export function LayoutsSidebar({ onSelectLayout }: LayoutsSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Layouts</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Escolhe um modelo base
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {PREDEFINED_LAYOUTS.map((layout) => {
            const IconComponent = LAYOUT_ICONS[layout.id] || LayoutTemplate;
            
            return (
              <div
                key={layout.id}
                onClick={() => onSelectLayout(layout)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  "bg-card hover:bg-accent hover:border-primary/50 cursor-pointer",
                  "transition-all duration-150"
                )}
              >
                <div className="p-2 rounded-md bg-muted">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium">{layout.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {layout.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {layout.blocks.length} blocos
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
