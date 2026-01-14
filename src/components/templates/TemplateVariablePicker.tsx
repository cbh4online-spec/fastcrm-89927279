import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  variableCategories,
  TemplateVariable,
} from '@/lib/templateVariables';
import {
  Variable,
  Search,
  User,
  Target,
  Building2,
  UserCircle,
  UserCheck,
  Calendar,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateVariablePickerProps {
  onInsert: (variable: string) => void;
  trigger?: React.ReactNode;
  compatibleModules?: string[];
}

const iconMap: Record<string, React.ElementType> = {
  User: User,
  Target: Target,
  Building2: Building2,
  UserCircle: UserCircle,
  UserCheck: UserCheck,
  Calendar: Calendar,
};

export function TemplateVariablePicker({
  onInsert,
  trigger,
  compatibleModules,
}: TemplateVariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Filter categories based on compatible modules
  const filteredCategories = variableCategories.filter(category => {
    if (!compatibleModules || compatibleModules.length === 0) return true;
    // Map category ids to module names
    const categoryToModule: Record<string, string[]> = {
      lead: ['lead', 'inbox'],
      opportunity: ['opportunity'],
      company: ['company'],
      contact: ['contact'],
      user: ['lead', 'opportunity', 'inbox', 'contact', 'company'],
      date: ['lead', 'opportunity', 'inbox', 'contact', 'company'],
    };
    const allowedModules = categoryToModule[category.id] || [];
    return allowedModules.some(m => compatibleModules.includes(m));
  });
  
  // Filter variables by search
  const searchVariables = (variables: TemplateVariable[]) => {
    if (!search) return variables;
    const searchLower = search.toLowerCase();
    return variables.filter(
      v =>
        v.label.toLowerCase().includes(searchLower) ||
        v.key.toLowerCase().includes(searchLower) ||
        v.description.toLowerCase().includes(searchLower)
    );
  };
  
  const handleInsert = (variable: TemplateVariable) => {
    onInsert(variable.key);
    setCopiedKey(variable.key);
    setTimeout(() => setCopiedKey(null), 1500);
  };
  
  const handleCopy = (variable: TemplateVariable, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(variable.key);
    setCopiedKey(variable.key);
    setTimeout(() => setCopiedKey(null), 1500);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Variable className="h-4 w-4" />
            Variáveis
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[400px] p-0" 
        align="start"
        side="right"
        sideOffset={5}
      >
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar variáveis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          <Accordion type="multiple" defaultValue={filteredCategories.map(c => c.id)} className="px-2 py-1">
            {filteredCategories.map((category) => {
              const Icon = iconMap[category.icon] || Variable;
              const variables = searchVariables(category.variables);
              
              if (variables.length === 0) return null;
              
              return (
                <AccordionItem key={category.id} value={category.id} className="border-b-0">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {category.label}
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        {variables.length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-1">
                      {variables.map((variable) => (
                        <div
                          key={variable.key}
                          className={cn(
                            'flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer',
                            'hover:bg-muted transition-colors group'
                          )}
                          onClick={() => handleInsert(variable)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded font-mono">
                                {variable.key.replace(/\{\{|\}\}/g, '')}
                              </code>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {variable.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => handleCopy(variable, e)}
                            >
                              {copiedKey === variable.key ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          
          {filteredCategories.every(c => searchVariables(c.variables).length === 0) && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Nenhuma variável encontrada
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Clica numa variável para inserir no editor
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
