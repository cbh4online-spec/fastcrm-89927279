import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Wand2,
  Eye,
  Mail,
  Phone,
  Calendar,
  Hash,
  Link,
  ToggleLeft,
  Tag,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  ColumnMapping,
  ColumnDetection,
  DetectedDataType,
  ENTITY_FIELDS,
  ImportEntityType,
  NewFieldConfig,
  DataTransformation,
} from "@/types/import";

interface ColumnMappingStepProps {
  importType: ImportEntityType;
  columnDetections: ColumnDetection[];
  columnMappings: ColumnMapping[];
  onMappingChange: (mappings: ColumnMapping[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const TYPE_ICONS: Record<DetectedDataType, React.ElementType> = {
  text: FileText,
  email: Mail,
  phone: Phone,
  date: Calendar,
  number: Hash,
  currency: DollarSign,
  url: Link,
  boolean: ToggleLeft,
  tags: Tag,
  nif: Hash,
  postal_code: Hash,
};

const TYPE_LABELS: Record<DetectedDataType, string> = {
  text: 'Texto',
  email: 'Email',
  phone: 'Telefone',
  date: 'Data',
  number: 'Número',
  currency: 'Moeda',
  url: 'URL',
  boolean: 'Sim/Não',
  tags: 'Tags',
  nif: 'NIF',
  postal_code: 'Código Postal',
};

const CONFIDENCE_COLORS = {
  high: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const CONFIDENCE_LABELS = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

interface NewFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnHeader: string;
  detectedType: DetectedDataType;
  importType: ImportEntityType;
  onCreateField: (config: NewFieldConfig) => void;
}

function NewFieldDialog({
  open,
  onOpenChange,
  columnHeader,
  detectedType,
  importType,
  onCreateField,
}: NewFieldDialogProps) {
  const [name, setName] = useState(columnHeader.toLowerCase().replace(/\s+/g, '_'));
  const [label, setLabel] = useState(columnHeader);
  const [fieldType, setFieldType] = useState<NewFieldConfig['fieldType']>(
    detectedType === 'currency' || detectedType === 'number' ? 'number' :
    detectedType === 'date' ? 'date' :
    detectedType === 'boolean' ? 'boolean' :
    'text'
  );
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(false);

  const handleCreate = () => {
    onCreateField({
      name,
      label,
      fieldType,
      entityType: importType,
      options: fieldType === 'select' ? options.split(',').map(o => o.trim()).filter(Boolean) : undefined,
      required,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Campo Personalizado</DialogTitle>
          <DialogDescription>
            Se não existe um campo para esta informação, cria um novo agora.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fieldName">Nome interno</Label>
            <Input
              id="fieldName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: numero_cliente"
            />
            <p className="text-xs text-muted-foreground">
              Usado internamente (sem espaços, minúsculas)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fieldLabel">Título mostrado</Label>
            <Input
              id="fieldLabel"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Número de Cliente"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fieldType">Tipo de campo</Label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as NewFieldConfig['fieldType'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="boolean">Checkbox (Sim/Não)</SelectItem>
                <SelectItem value="select">Lista de opções</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fieldType === 'select' && (
            <div className="space-y-2">
              <Label htmlFor="options">Opções (separadas por vírgula)</Label>
              <Input
                id="options"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="Opção 1, Opção 2, Opção 3"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch id="required" checked={required} onCheckedChange={setRequired} />
            <Label htmlFor="required">Campo obrigatório</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!name || !label}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Campo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ColumnMappingStep({
  importType,
  columnDetections,
  columnMappings,
  onMappingChange,
  onNext,
  onBack,
}: ColumnMappingStepProps) {
  const [newFieldDialogOpen, setNewFieldDialogOpen] = useState(false);
  const [selectedColumnForNewField, setSelectedColumnForNewField] = useState<string | null>(null);
  const [createdFields, setCreatedFields] = useState<NewFieldConfig[]>([]);

  const availableFields = ENTITY_FIELDS[importType] || [];

  // Group fields by category
  const groupedFields = availableFields.reduce<Record<string, typeof availableFields>>((acc, field) => {
    const group = field.group || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});

  const GROUP_LABELS: Record<string, string> = {
    basic: 'Informação Básica',
    work: 'Trabalho',
    fiscal: 'Fiscal',
    address: 'Morada',
    contact: 'Contacto',
    social: 'Redes Sociais',
    crm: 'CRM',
    financial: 'Financeiro',
    commercial: 'Comercial',
    info: 'Informação',
    pricing: 'Preços',
    status: 'Estado',
    dates: 'Datas',
    other: 'Outros',
  };

  const handleMappingChange = (columnHeader: string, targetField: string) => {
    const updatedMappings = columnMappings.map((mapping) => {
      if (mapping.sourceColumn === columnHeader) {
        const isNewField = targetField.startsWith('new:');
        return {
          ...mapping,
          targetField: targetField === 'ignore' ? null : (isNewField ? targetField.replace('new:', '') : targetField),
          isNewField,
        };
      }
      return mapping;
    });
    onMappingChange(updatedMappings);
  };

  const handleTypeChange = (columnHeader: string, type: DetectedDataType) => {
    const updatedMappings = columnMappings.map((mapping) => {
      if (mapping.sourceColumn === columnHeader) {
        return { ...mapping, manualType: type };
      }
      return mapping;
    });
    onMappingChange(updatedMappings);
  };

  const handleTransformationToggle = (columnHeader: string, transformationIndex: number) => {
    const updatedMappings = columnMappings.map((mapping) => {
      if (mapping.sourceColumn === columnHeader) {
        const newTransformations = [...mapping.transformations];
        newTransformations[transformationIndex] = {
          ...newTransformations[transformationIndex],
          enabled: !newTransformations[transformationIndex].enabled,
        };
        return { ...mapping, transformations: newTransformations };
      }
      return mapping;
    });
    onMappingChange(updatedMappings);
  };

  const openNewFieldDialog = (columnHeader: string) => {
    setSelectedColumnForNewField(columnHeader);
    setNewFieldDialogOpen(true);
  };

  const handleCreateNewField = (config: NewFieldConfig) => {
    setCreatedFields([...createdFields, config]);
    if (selectedColumnForNewField) {
      handleMappingChange(selectedColumnForNewField, `new:${config.name}`);
    }
    setNewFieldDialogOpen(false);
    setSelectedColumnForNewField(null);
  };

  const getMappingForColumn = (header: string) => {
    return columnMappings.find((m) => m.sourceColumn === header);
  };

  const getDetectionForColumn = (header: string) => {
    return columnDetections.find((d) => d.header === header);
  };

  const hasRequiredFieldsMapped = () => {
    const requiredFields = availableFields.filter((f) => f.required);
    return requiredFields.every((field) =>
      columnMappings.some((m) => m.targetField === field.field)
    );
  };

  const mappedFieldsCount = columnMappings.filter((m) => m.targetField).length;
  const ignoredFieldsCount = columnMappings.filter((m) => !m.targetField).length;

  const selectedColumn = selectedColumnForNewField
    ? getDetectionForColumn(selectedColumnForNewField)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Mapeamento de Colunas
          </span>
          <div className="flex gap-2">
            <Badge variant="secondary" className="font-normal">
              {mappedFieldsCount} mapeados
            </Badge>
            {ignoredFieldsCount > 0 && (
              <Badge variant="outline" className="font-normal">
                {ignoredFieldsCount} ignorados
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Para cada coluna do ficheiro, escolhe o campo de destino ou cria um novo campo personalizado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {columnDetections.map((detection) => {
              const mapping = getMappingForColumn(detection.header);
              const TypeIcon = TYPE_ICONS[mapping?.manualType || detection.detectedType] || FileText;

              return (
                <div
                  key={detection.header}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Column header and sample */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{detection.header}</h4>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className={`text-xs ${CONFIDENCE_COLORS[detection.confidence]}`}
                              >
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {TYPE_LABELS[detection.detectedType]}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Confiança: {CONFIDENCE_LABELS[detection.confidence]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Ex: {detection.sampleValues[0] || '-'}
                      </p>
                    </div>

                    {/* Mapping selector */}
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={mapping?.targetField || 'ignore'}
                        onValueChange={(value) => handleMappingChange(detection.header, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Selecionar campo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignore">
                            <span className="text-muted-foreground">Ignorar coluna</span>
                          </SelectItem>
                          {Object.entries(groupedFields).map(([group, fields]) => (
                            <SelectGroup key={group}>
                              <SelectLabel>{GROUP_LABELS[group] || group}</SelectLabel>
                              {fields.map((field) => (
                                <SelectItem key={field.field} value={field.field}>
                                  {field.label} {field.required && '*'}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                          {createdFields.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Campos Criados</SelectLabel>
                              {createdFields.map((field) => (
                                <SelectItem key={field.name} value={`new:${field.name}`}>
                                  {field.label} (novo)
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => openNewFieldDialog(detection.header)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Type override */}
                  {mapping?.targetField && (
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Tipo:</span>
                      <Select
                        value={mapping.manualType || detection.detectedType}
                        onValueChange={(v) => handleTypeChange(detection.header, v as DetectedDataType)}
                      >
                        <SelectTrigger className="w-[140px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([type, label]) => (
                            <SelectItem key={type} value={type} className="text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Transformations */}
                      {detection.suggestedTransformations && detection.suggestedTransformations.length > 0 && (
                        <div className="flex items-center gap-2 ml-4">
                          {detection.suggestedTransformations.map((transform, idx) => {
                            const mappingTransform = mapping.transformations[idx];
                            return (
                              <TooltipProvider key={idx}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={mappingTransform?.enabled ? 'secondary' : 'ghost'}
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleTransformationToggle(detection.header, idx)}
                                    >
                                      {mappingTransform?.enabled ? (
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                      ) : (
                                        <Wand2 className="h-3 w-3 mr-1" />
                                      )}
                                      {transform.description.split(' ')[0]}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs">
                                    <p className="font-medium">{transform.description}</p>
                                    {transform.example && (
                                      <p className="text-xs mt-1">
                                        <span className="text-muted-foreground">{transform.example.before}</span>
                                        <ArrowRight className="inline h-3 w-3 mx-1" />
                                        <span className="text-green-600">{transform.example.after}</span>
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Required fields warning */}
        {!hasRequiredFieldsMapped() && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm mt-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Campos obrigatórios não mapeados: Nome</span>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t mt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={onNext} disabled={!hasRequiredFieldsMapped()}>
            Pré-visualizar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>

      {/* New Field Dialog */}
      <NewFieldDialog
        open={newFieldDialogOpen}
        onOpenChange={setNewFieldDialogOpen}
        columnHeader={selectedColumnForNewField || ''}
        detectedType={selectedColumn?.detectedType || 'text'}
        importType={importType}
        onCreateField={handleCreateNewField}
      />
    </Card>
  );
}
