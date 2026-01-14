import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  extractVariables,
  isValidVariable,
  getVariableInfo,
} from '@/lib/templateVariables';
import { TemplateVariablePicker } from './TemplateVariablePicker';
import { 
  Variable, 
  CheckCircle2, 
  AlertCircle, 
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VariableHighlightedEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compatibleModules?: string[];
  minHeight?: string;
}

interface VariableStatus {
  key: string;
  isValid: boolean;
  info?: {
    label: string;
    description: string;
    category: string;
    example: string;
  };
}

export function VariableHighlightedEditor({
  value,
  onChange,
  placeholder = 'Escreve o teu template aqui...',
  className,
  compatibleModules = [],
  minHeight = '200px',
}: VariableHighlightedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [variables, setVariables] = useState<VariableStatus[]>([]);
  
  // Extract and analyze variables
  useEffect(() => {
    const extracted = extractVariables(value);
    const analyzed = extracted.map(key => ({
      key,
      isValid: isValidVariable(key),
      info: getVariableInfo(key),
    }));
    setVariables(analyzed);
  }, [value]);
  
  // Sync scroll between textarea and highlight overlay
  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);
  
  // Insert variable at cursor position
  const handleInsertVariable = useCallback((variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + variable);
      return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + variable + value.substring(end);
    onChange(newValue);
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [value, onChange]);
  
  // Render highlighted content
  const renderHighlightedContent = () => {
    if (!value) return null;
    
    // Split by variable patterns and reconstruct with highlights
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\{\{[^}]+\}\}/g;
    let match;
    
    while ((match = regex.exec(value)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="invisible">
            {value.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // Add highlighted variable
      const varKey = match[0];
      const isValid = isValidVariable(varKey);
      parts.push(
        <span
          key={`var-${match.index}`}
          className={cn(
            'rounded px-0.5 -mx-0.5',
            isValid 
              ? 'bg-primary/20 border border-primary/30' 
              : 'bg-destructive/20 border border-destructive/30'
          )}
        >
          <span className="invisible">{varKey}</span>
        </span>
      );
      
      lastIndex = match.index + varKey.length;
    }
    
    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-end`} className="invisible">
          {value.substring(lastIndex)}
        </span>
      );
    }
    
    return parts;
  };
  
  const validCount = variables.filter(v => v.isValid).length;
  const invalidCount = variables.filter(v => !v.isValid).length;
  
  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {variables.length > 0 && (
            <>
              {validCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {validCount} válida{validCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  {invalidCount} inválida{invalidCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </>
          )}
        </div>
        
        <TemplateVariablePicker
          onInsert={handleInsertVariable}
          compatibleModules={compatibleModules}
          trigger={
            <Button type="button" size="sm" variant="outline">
              <Variable className="h-4 w-4 mr-2" />
              Inserir Variável
            </Button>
          }
        />
      </div>
      
      {/* Editor with highlight overlay */}
      <div className="relative">
        {/* Highlight overlay */}
        <div
          ref={highlightRef}
          className={cn(
            'absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words',
            'font-mono text-sm p-3',
            className
          )}
          style={{ minHeight }}
          aria-hidden="true"
        >
          {renderHighlightedContent()}
        </div>
        
        {/* Actual textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          placeholder={placeholder}
          className={cn(
            'font-mono text-sm resize-none',
            'bg-transparent relative z-10',
            className
          )}
          style={{ minHeight }}
        />
      </div>
      
      {/* Variables panel */}
      {variables.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Variáveis utilizadas ({variables.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TooltipProvider delayDuration={200}>
              {variables.map((variable, idx) => (
                <Tooltip key={`${variable.key}-${idx}`}>
                  <TooltipTrigger asChild>
                    <Badge
                      variant={variable.isValid ? 'secondary' : 'destructive'}
                      className={cn(
                        'font-mono text-xs cursor-help transition-colors',
                        variable.isValid && 'hover:bg-primary/20'
                      )}
                    >
                      {variable.isValid ? (
                        <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {variable.key.replace(/\{\{|\}\}/g, '')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {variable.isValid && variable.info ? (
                      <div className="space-y-1">
                        <p className="font-medium">{variable.info.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {variable.info.description}
                        </p>
                        <p className="text-xs">
                          <span className="text-muted-foreground">Exemplo: </span>
                          <span className="font-medium">{variable.info.example}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-destructive-foreground">
                        Variável não reconhecida
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  );
}
