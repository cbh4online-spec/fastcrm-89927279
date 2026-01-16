import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Building2, GraduationCap, Stethoscope, Briefcase, Plus } from "lucide-react";
import { useCreateManagedField } from "@/hooks/useManagedFields";
import { 
  INDUSTRY_FIELD_SUGGESTIONS, 
  ENTITY_TYPE_LABELS,
  FIELD_TYPE_LABELS,
  type FieldEntityType,
  type CreateManagedFieldInput
} from "@/types/fieldManager";
import { toast } from "sonner";

interface AISuggestFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INDUSTRY_OPTIONS = [
  { key: 'formacao', label: 'Formação / Escola', icon: GraduationCap, description: 'Campos para gestão de alunos, matrículas e cursos' },
  { key: 'saude', label: 'Saúde / Clínica', icon: Stethoscope, description: 'Campos para pacientes, consultas e historial clínico' },
  { key: 'servicos', label: 'Serviços', icon: Briefcase, description: 'Campos para gestão de contratos e projetos' },
  { key: 'agencia', label: 'Agência', icon: Building2, description: 'Campos para marcas, campanhas e briefings' },
];

export function AISuggestFieldsDialog({ open, onOpenChange }: AISuggestFieldsDialogProps) {
  const createField = useCreateManagedField();
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const suggestions = selectedIndustry ? INDUSTRY_FIELD_SUGGESTIONS[selectedIndustry] || [] : [];

  const handleSelectField = (entityIndex: number, fieldIndex: number) => {
    const key = `${entityIndex}-${fieldIndex}`;
    const newSelected = new Set(selectedFields);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedFields(newSelected);
  };

  const handleSelectAll = () => {
    const allKeys = new Set<string>();
    suggestions.forEach((group, entityIndex) => {
      group.fields.forEach((_, fieldIndex) => {
        allKeys.add(`${entityIndex}-${fieldIndex}`);
      });
    });
    setSelectedFields(allKeys);
  };

  const handleDeselectAll = () => {
    setSelectedFields(new Set());
  };

  const handleCreate = async () => {
    if (selectedFields.size === 0) return;

    setIsCreating(true);
    let created = 0;
    let errors = 0;

    for (const key of selectedFields) {
      const [entityIndex, fieldIndex] = key.split('-').map(Number);
      const group = suggestions[entityIndex];
      const field = group.fields[fieldIndex];

      try {
        await createField.mutateAsync({
          entity_type: group.entity,
          name: field.label,
          label: field.label,
          field_type: field.field_type,
          options: field.options,
          required: field.required,
          is_unique: field.is_unique,
          origin: 'ai',
        });
        created++;
      } catch {
        errors++;
      }
    }

    setIsCreating(false);
    
    if (created > 0) {
      toast.success(`${created} campo(s) criado(s) com sucesso`);
    }
    if (errors > 0) {
      toast.error(`${errors} campo(s) falharam`);
    }

    setSelectedFields(new Set());
    setSelectedIndustry(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sugerir Campos com IA
          </DialogTitle>
          <DialogDescription>
            Selecione o tipo de negócio para receber sugestões de campos personalizados.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {!selectedIndustry ? (
            <div className="grid grid-cols-2 gap-4">
              {INDUSTRY_OPTIONS.map((industry) => (
                <Card 
                  key={industry.key}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedIndustry(industry.key)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <industry.icon className="h-5 w-5 text-primary" />
                      {industry.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {industry.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedIndustry(null);
                    setSelectedFields(new Set());
                  }}
                >
                  ← Voltar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Selecionar todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Limpar seleção
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 inline mr-1" />
                  Negócios de {INDUSTRY_OPTIONS.find(i => i.key === selectedIndustry)?.label.toLowerCase()} 
                  costumam usar os seguintes campos:
                </p>
              </div>

              {suggestions.map((group, entityIndex) => (
                <div key={group.entity} className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    {ENTITY_TYPE_LABELS[group.entity]}
                    <Badge variant="secondary">{group.fields.length} campos</Badge>
                  </h3>
                  <div className="space-y-2">
                    {group.fields.map((field, fieldIndex) => {
                      const key = `${entityIndex}-${fieldIndex}`;
                      const isSelected = selectedFields.has(key);
                      
                      return (
                        <label 
                          key={key}
                          className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => handleSelectField(entityIndex, fieldIndex)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{field.label}</span>
                              <Badge variant="outline" className="text-xs">
                                {FIELD_TYPE_LABELS[field.field_type]}
                              </Badge>
                              {field.is_unique && (
                                <Badge variant="secondary" className="text-xs">Único</Badge>
                              )}
                            </div>
                            {field.options && (
                              <div className="flex flex-wrap gap-1">
                                {field.options.map(opt => (
                                  <Badge key={opt} variant="outline" className="text-xs">
                                    {opt}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {suggestions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Sem sugestões disponíveis para esta indústria.</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={selectedFields.size === 0 || isCreating}
          >
            {isCreating ? (
              "A criar..."
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar {selectedFields.size} Campo{selectedFields.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
