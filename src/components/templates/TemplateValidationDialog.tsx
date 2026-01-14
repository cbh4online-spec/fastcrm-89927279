import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  validateTemplate,
  renderTemplate,
  getVariableInfo,
  VariableContext,
  ValidationResult,
} from '@/lib/templateVariables';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Link,
  Trash2,
  Send,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  subject?: string;
  context: VariableContext;
  onApply: (renderedContent: string, renderedSubject?: string, variablesUsed?: Record<string, string>) => void;
  isApplying?: boolean;
}

type ResolutionMode = 'fill' | 'map' | 'remove';

interface VariableResolution {
  variable: string;
  mode: ResolutionMode;
  value: string;
  mappedField?: string;
}

export function TemplateValidationDialog({
  open,
  onOpenChange,
  content,
  subject,
  context,
  onApply,
  isApplying = false,
}: TemplateValidationDialogProps) {
  const [resolutions, setResolutions] = useState<Record<string, VariableResolution>>({});
  
  // Validate template
  const validation = useMemo(() => validateTemplate(content, context), [content, context]);
  const subjectValidation = useMemo(
    () => (subject ? validateTemplate(subject, context) : null),
    [subject, context]
  );
  
  // Combine unresolved variables from content and subject
  const allUnresolved = useMemo(() => {
    const set = new Set<string>();
    validation.unresolvedVariables.forEach(v => set.add(v));
    subjectValidation?.unresolvedVariables.forEach(v => set.add(v));
    return Array.from(set);
  }, [validation, subjectValidation]);
  
  const allInvalid = useMemo(() => {
    const set = new Set<string>();
    validation.invalidVariables.forEach(v => set.add(v));
    subjectValidation?.invalidVariables.forEach(v => set.add(v));
    return Array.from(set);
  }, [validation, subjectValidation]);
  
  const hasIssues = allUnresolved.length > 0 || allInvalid.length > 0;
  
  // Initialize resolutions for unresolved variables
  React.useEffect(() => {
    const newResolutions: Record<string, VariableResolution> = {};
    allUnresolved.forEach(variable => {
      if (!resolutions[variable]) {
        newResolutions[variable] = {
          variable,
          mode: 'fill',
          value: '',
        };
      }
    });
    if (Object.keys(newResolutions).length > 0) {
      setResolutions(prev => ({ ...prev, ...newResolutions }));
    }
  }, [allUnresolved]);
  
  const updateResolution = (variable: string, updates: Partial<VariableResolution>) => {
    setResolutions(prev => ({
      ...prev,
      [variable]: { ...prev[variable], ...updates },
    }));
  };
  
  const handleApply = () => {
    // Build final context with manual values
    let renderedContent = content;
    let renderedSubject = subject;
    const variablesUsed: Record<string, string> = { ...validation.resolvedVariables };
    
    // Apply resolutions
    Object.values(resolutions).forEach(resolution => {
      if (resolution.mode === 'fill' && resolution.value) {
        const regex = new RegExp(resolution.variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        renderedContent = renderedContent.replace(regex, resolution.value);
        if (renderedSubject) {
          renderedSubject = renderedSubject.replace(regex, resolution.value);
        }
        variablesUsed[resolution.variable] = resolution.value;
      } else if (resolution.mode === 'remove') {
        const regex = new RegExp(resolution.variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        renderedContent = renderedContent.replace(regex, '');
        if (renderedSubject) {
          renderedSubject = renderedSubject.replace(regex, '');
        }
      }
    });
    
    // Render with context
    renderedContent = renderTemplate(renderedContent, context);
    if (renderedSubject) {
      renderedSubject = renderTemplate(renderedSubject, context);
    }
    
    onApply(renderedContent, renderedSubject, variablesUsed);
  };
  
  const canApply = () => {
    // Check all unresolved have been handled
    return allUnresolved.every(v => {
      const resolution = resolutions[v];
      if (!resolution) return false;
      if (resolution.mode === 'fill') return resolution.value.length > 0;
      if (resolution.mode === 'remove') return true;
      return false;
    }) && allInvalid.every(v => {
      const resolution = resolutions[v];
      return resolution?.mode === 'remove';
    });
  };
  
  const getStatusIcon = (variable: string) => {
    if (allInvalid.includes(variable)) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    const resolution = resolutions[variable];
    if (resolution?.mode === 'fill' && resolution.value) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (resolution?.mode === 'remove') {
      return <Trash2 className="h-4 w-4 text-muted-foreground" />;
    }
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasIssues ? (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Validação do Template
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Template Pronto
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasIssues
              ? 'Algumas variáveis precisam de atenção antes de aplicar o template.'
              : 'Todas as variáveis foram resolvidas. O template está pronto para enviar.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4 pr-4">
            {/* Resolved Variables */}
            {Object.keys(validation.resolvedVariables).length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Variáveis Resolvidas ({Object.keys(validation.resolvedVariables).length})
                </Label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(validation.resolvedVariables).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <code className="text-[10px]">{key.replace(/\{\{|\}\}/g, '')}</code>
                      <span className="text-muted-foreground">→</span>
                      <span className="max-w-[100px] truncate">{value}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Invalid Variables */}
            {allInvalid.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Variáveis inválidas:</strong> {allInvalid.join(', ')}
                  <p className="text-xs mt-1">
                    Estas variáveis não são reconhecidas e serão removidas.
                  </p>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Unresolved Variables */}
            {allUnresolved.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Variáveis por Resolver ({allUnresolved.length})
                </Label>
                
                {allUnresolved.map((variable) => {
                  const info = getVariableInfo(variable);
                  const resolution = resolutions[variable];
                  
                  return (
                    <div
                      key={variable}
                      className="p-3 border rounded-lg space-y-2 bg-muted/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(variable)}
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {variable}
                          </code>
                          {info && (
                            <span className="text-xs text-muted-foreground">
                              {info.label}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={resolution?.mode || 'fill'}
                          onValueChange={(v) => updateResolution(variable, { mode: v as ResolutionMode })}
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fill">
                              <div className="flex items-center gap-2">
                                <Edit3 className="h-3 w-3" />
                                Preencher valor
                              </div>
                            </SelectItem>
                            <SelectItem value="remove">
                              <div className="flex items-center gap-2">
                                <Trash2 className="h-3 w-3" />
                                Remover
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {resolution?.mode === 'fill' && (
                          <Input
                            value={resolution.value}
                            onChange={(e) => updateResolution(variable, { value: e.target.value })}
                            placeholder={info?.example || 'Introduz um valor...'}
                            className="flex-1 h-8"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Preview */}
            {!hasIssues && (
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Pré-visualização Final
                </Label>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  {subject && (
                    <div className="text-sm font-medium mb-2 pb-2 border-b">
                      Assunto: {renderTemplate(subject, context)}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">
                    {renderTemplate(content, context)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={hasIssues && !canApply() || isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A aplicar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Aplicar Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
