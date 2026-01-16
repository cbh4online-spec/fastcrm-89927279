import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Pencil, X, AlertTriangle, Search } from "lucide-react";
import { CrmEntityType } from "@/hooks/useCrmViews";

export interface BulkEditField {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "boolean";
  options?: { value: string; label: string }[];
  section?: string;
}

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: CrmEntityType;
  selectedCount: number;
  fields: BulkEditField[];
  onApply: (changes: Record<string, unknown>) => Promise<void>;
}

// Map fields to sections
const fieldSections: Record<string, string> = {
  name: "info",
  email: "info",
  phone: "info",
  whatsapp_number: "info",
  has_whatsapp: "info",
  company: "info",
  job_title: "info",
  commercial_name: "info",
  address: "location",
  city: "location",
  postal_code: "location",
  country: "location",
  source: "classification",
  lead_source: "classification",
  client_status: "classification",
  client_types: "classification",
  abc_category: "classification",
  ai_temperature: "ai",
  ai_contact_type: "ai",
  ai_next_action_type: "ai",
  contact_score: "ai",
  conversion_probability: "ai",
  estimated_value: "ai",
  automation_active: "automation",
  assigned_to: "automation",
  is_primary_contact: "automation",
  tax_id: "fiscal",
  entity_type: "fiscal",
  fiscal_regime: "fiscal",
  is_fiscal_address: "fiscal",
  business_area: "business",
  cae_code: "business",
  cae_description: "business",
  credit_active: "financial",
  credit_limit: "financial",
  payment_conditions: "financial",
  preferred_payment_method: "financial",
  average_ticket: "financial",
  total_revenue: "financial",
  sales_2023: "sales",
  sales_2024: "sales",
  sales_2025: "sales",
  sales_2026: "sales",
  linkedin_url: "social",
  facebook_url: "social",
  instagram_url: "social",
  twitter_url: "social",
  notes: "other",
};

const sectionLabels: Record<string, string> = {
  info: "Informação Básica",
  location: "Localização",
  classification: "Classificação e Status",
  ai: "IA e Análise",
  automation: "Automação e Atribuição",
  fiscal: "Dados Fiscais",
  business: "Negócio",
  financial: "Financeiro",
  sales: "Histórico de Vendas",
  social: "Redes Sociais",
  other: "Outros",
};

const sectionOrder = ["info", "location", "classification", "ai", "automation", "fiscal", "business", "financial", "sales", "social", "other"];

export function BulkEditDialog({
  open,
  onOpenChange,
  entityType,
  selectedCount,
  fields,
  onApply,
}: BulkEditDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [isApplying, setIsApplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const getEntityLabel = () => {
    if (entityType === "contacts") return { singular: "contacto", plural: "contactos" };
    if (entityType === "opportunities") return { singular: "negócio", plural: "negócios" };
    return { singular: "registo", plural: "registos" };
  };
  const { singular: entityLabel, plural: entityLabelPlural } = getEntityLabel();

  // Group fields by section
  const fieldsBySection = useMemo(() => {
    const grouped: Record<string, BulkEditField[]> = {};
    
    fields.forEach((field) => {
      const section = fieldSections[field.key] || "other";
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(field);
    });
    
    return grouped;
  }, [fields]);

  // Filter fields by search term
  const filteredFieldsBySection = useMemo(() => {
    if (!searchTerm.trim()) return fieldsBySection;
    
    const term = searchTerm.toLowerCase();
    const filtered: Record<string, BulkEditField[]> = {};
    
    Object.entries(fieldsBySection).forEach(([section, sectionFields]) => {
      const matchingFields = sectionFields.filter((field) => 
        field.label.toLowerCase().includes(term) || 
        field.key.toLowerCase().includes(term)
      );
      if (matchingFields.length > 0) {
        filtered[section] = matchingFields;
      }
    });
    
    return filtered;
  }, [fieldsBySection, searchTerm]);

  const toggleField = (key: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(key)) {
      newSelected.delete(key);
      const newValues = { ...fieldValues };
      delete newValues[key];
      setFieldValues(newValues);
    } else {
      newSelected.add(key);
    }
    setSelectedFields(newSelected);
  };

  const updateFieldValue = (key: string, value: unknown) => {
    setFieldValues({ ...fieldValues, [key]: value });
  };

  const handleApply = async () => {
    const changes: Record<string, unknown> = {};
    selectedFields.forEach((key) => {
      if (fieldValues[key] !== undefined) {
        changes[key] = fieldValues[key];
      }
    });

    if (Object.keys(changes).length === 0) {
      return;
    }

    setIsApplying(true);
    try {
      await onApply(changes);
      setSelectedFields(new Set());
      setFieldValues({});
      setSearchTerm("");
      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setSelectedFields(new Set());
    setFieldValues({});
    setSearchTerm("");
    onOpenChange(false);
  };

  const renderFieldInput = (field: BulkEditField) => {
    const isSelected = selectedFields.has(field.key);

    switch (field.type) {
      case "select":
        return (
          <Select
            disabled={!isSelected}
            value={fieldValues[field.key] as string || ""}
            onValueChange={(value) => updateFieldValue(field.key, value)}
          >
            <SelectTrigger className={!isSelected ? "opacity-50" : ""}>
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "number":
        return (
          <Input
            type="number"
            disabled={!isSelected}
            className={!isSelected ? "opacity-50" : ""}
            value={fieldValues[field.key] as number || ""}
            onChange={(e) => updateFieldValue(field.key, e.target.value ? Number(e.target.value) : null)}
            placeholder="Introduzir valor..."
          />
        );

      case "boolean":
        return (
          <Select
            disabled={!isSelected}
            value={fieldValues[field.key] === true ? "true" : fieldValues[field.key] === false ? "false" : ""}
            onValueChange={(value) => updateFieldValue(field.key, value === "true")}
          >
            <SelectTrigger className={!isSelected ? "opacity-50" : ""}>
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            disabled={!isSelected}
            className={!isSelected ? "opacity-50" : ""}
            value={fieldValues[field.key] as string || ""}
            onChange={(e) => updateFieldValue(field.key, e.target.value || null)}
            placeholder="Introduzir valor..."
          />
        );
    }
  };

  const renderFieldRow = (field: BulkEditField) => {
    const isSelected = selectedFields.has(field.key);
    
    return (
      <div key={field.key} className="py-2 border-b border-border/50 last:border-0">
        <div className="flex items-start gap-3">
          <Checkbox
            id={`field-${field.key}`}
            checked={isSelected}
            onCheckedChange={() => toggleField(field.key)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Label
                htmlFor={`field-${field.key}`}
                className="text-sm font-medium cursor-pointer"
              >
                {field.label}
              </Label>
              {isSelected && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  Selecionado
                </Badge>
              )}
            </div>
            {isSelected && (
              <div className="mt-2">
                {renderFieldInput(field)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const sectionsWithFields = sectionOrder.filter((section) => filteredFieldsBySection[section]?.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edição em massa
          </DialogTitle>
          <DialogDescription>
            Edite campos de {selectedCount} {selectedCount === 1 ? entityLabel : entityLabelPlural} selecionado{selectedCount === 1 ? "" : "s"}.
            Marque os campos que pretende alterar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3 py-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Warning */}
          {selectedFields.size > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">Atenção</p>
                <p className="text-xs mt-1">
                  Os valores atuais serão substituídos para todos os {selectedCount} registos selecionados.
                </p>
              </div>
            </div>
          )}

          {/* Selected fields summary */}
          {selectedFields.size > 0 && (
            <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground mr-1">Campos a editar:</span>
              {Array.from(selectedFields).map((key) => {
                const field = fields.find((f) => f.key === key);
                return (
                  <Badge key={key} variant="secondary" className="text-xs flex items-center gap-1">
                    {field?.label}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => toggleField(key)}
                    />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Fields accordion */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-[350px]">
              <Accordion type="multiple" defaultValue={["info", "classification"]} className="w-full pr-4">
                {sectionsWithFields.map((section) => (
                  <AccordionItem key={section} value={section}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sectionLabels[section]}</span>
                        <Badge variant="outline" className="text-xs">
                          {filteredFieldsBySection[section]?.length || 0}
                        </Badge>
                        {filteredFieldsBySection[section]?.some((f) => selectedFields.has(f.key)) && (
                          <Badge variant="default" className="text-xs">
                            {filteredFieldsBySection[section]?.filter((f) => selectedFields.has(f.key)).length} selecionado(s)
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-0">
                        {filteredFieldsBySection[section]?.map(renderFieldRow)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedFields.size === 0 || isApplying}
          >
            {isApplying ? "A aplicar..." : `Aplicar a ${selectedCount} registos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
