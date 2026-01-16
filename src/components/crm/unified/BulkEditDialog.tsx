import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Pencil, X, AlertTriangle } from "lucide-react";
import { CrmEntityType } from "@/hooks/useCrmViews";

export interface BulkEditField {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "boolean";
  options?: { value: string; label: string }[];
}

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: CrmEntityType;
  selectedCount: number;
  fields: BulkEditField[];
  onApply: (changes: Record<string, unknown>) => Promise<void>;
}

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

  const getEntityLabel = () => {
    if (entityType === "contacts") return { singular: "contacto", plural: "contactos" };
    if (entityType === "opportunities") return { singular: "negócio", plural: "negócios" };
    return { singular: "registo", plural: "registos" };
  };
  const { singular: entityLabel, plural: entityLabelPlural } = getEntityLabel();

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
      // Reset state
      setSelectedFields(new Set());
      setFieldValues({});
      onOpenChange(false);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setSelectedFields(new Set());
    setFieldValues({});
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
            <SelectContent>
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
            <SelectContent>
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edição em massa
          </DialogTitle>
          <DialogDescription>
            Edite campos de {selectedCount} {selectedCount === 1 ? entityLabel : entityLabelPlural} selecionado{selectedCount === 1 ? "" : "s"}.
            Selecione os campos que pretende alterar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {selectedFields.size > 0 && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">Atenção</p>
                <p className="text-xs mt-1">
                  Os valores atuais serão substituídos para todos os {selectedCount} registos selecionados.
                </p>
              </div>
            </div>
          )}

          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`field-${field.key}`}
                      checked={selectedFields.has(field.key)}
                      onCheckedChange={() => toggleField(field.key)}
                    />
                    <Label
                      htmlFor={`field-${field.key}`}
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {field.label}
                    </Label>
                    {selectedFields.has(field.key) && (
                      <Badge variant="secondary" className="text-xs">
                        A editar
                      </Badge>
                    )}
                  </div>
                  <div className="pl-6">
                    {renderFieldInput(field)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {selectedFields.size > 0 && (
          <div className="flex flex-wrap gap-1 pb-2">
            <span className="text-xs text-muted-foreground mr-1">Campos a editar:</span>
            {Array.from(selectedFields).map((key) => {
              const field = fields.find((f) => f.key === key);
              return (
                <Badge key={key} variant="outline" className="text-xs flex items-center gap-1">
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

        <DialogFooter>
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
