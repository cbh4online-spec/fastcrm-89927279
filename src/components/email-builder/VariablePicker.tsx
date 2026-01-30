import { useState } from 'react';
import { Variable, User, Building, Mail, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { DYNAMIC_VARIABLES, type DynamicVariable } from '@/types/emailBuilder';

interface VariablePickerProps {
  onInsert: (variable: string) => void;
  variant?: 'bar' | 'button' | 'compact';
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  contact: User,
  company: Building,
  campaign: Mail,
  date: Calendar,
};

const CATEGORY_NAMES: Record<string, string> = {
  contact: 'Contacto',
  company: 'Empresa',
  campaign: 'Campanha',
  date: 'Data',
};

export function VariablePicker({ onInsert, variant = 'bar', className }: VariablePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = Array.from(new Set(DYNAMIC_VARIABLES.map(v => v.category)));
  const filteredVariables = selectedCategory
    ? DYNAMIC_VARIABLES.filter(v => v.category === selectedCategory)
    : DYNAMIC_VARIABLES;

  if (variant === 'compact') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            <Variable className="h-4 w-4" />
            Variáveis
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm">Inserir Variável</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Clica para inserir no conteúdo
            </p>
          </div>
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              {DYNAMIC_VARIABLES.map((variable) => (
                <VariableItem
                  key={variable.key}
                  variable={variable}
                  onClick={() => onInsert(variable.key)}
                />
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }

  if (variant === 'button') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className={className}>
            <Variable className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Variáveis Dinâmicas
            </p>
            {DYNAMIC_VARIABLES.slice(0, 8).map((variable) => (
              <button
                key={variable.key}
                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent flex items-center justify-between group"
                onClick={() => onInsert(variable.key)}
              >
                <span>{variable.label}</span>
                <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded group-hover:bg-background">
                  {variable.key}
                </code>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full bar variant
  return (
    <div className={cn("border-t bg-muted/30 p-2", className)}>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Variable className="h-4 w-4" />
          <span className="text-xs font-medium">Variáveis:</span>
        </div>
        
        {/* Category filters */}
        <div className="flex items-center gap-1">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-xs px-2"
            onClick={() => setSelectedCategory(null)}
          >
            Todas
          </Button>
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category] || Variable;
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "secondary" : "ghost"}
                size="sm"
                className="h-6 text-xs px-2 gap-1"
                onClick={() => setSelectedCategory(category)}
              >
                <Icon className="h-3 w-3" />
                {CATEGORY_NAMES[category]}
              </Button>
            );
          })}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Variable chips */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
          {filteredVariables.map((variable) => (
            <button
              key={variable.key}
              onClick={() => onInsert(variable.key)}
              className={cn(
                "flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium",
                "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
                "border border-primary/20"
              )}
              title={`${variable.label} → ${variable.preview}`}
            >
              {variable.key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VariableItem({ 
  variable, 
  onClick 
}: { 
  variable: DynamicVariable; 
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICONS[variable.category] || Variable;
  
  return (
    <button
      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center gap-3 group"
      onClick={onClick}
    >
      <div className="p-1.5 rounded bg-muted group-hover:bg-background">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{variable.label}</p>
        <p className="text-xs text-muted-foreground truncate">{variable.key}</p>
      </div>
      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
        {variable.preview}
      </span>
    </button>
  );
}
