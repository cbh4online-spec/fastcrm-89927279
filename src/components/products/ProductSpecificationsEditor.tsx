import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronDown, ChevronRight, FileSpreadsheet, Sparkles, Edit2, Check, X } from "lucide-react";

// Predefined specification fields based on common product categories
const PREDEFINED_FIELDS: Record<string, string[]> = {
  default: ["marca", "modelo", "garantia", "peso", "dimensoes"],
  cameras: ["marca", "resolucao", "sensor", "lente", "visaoNoturna", "audio", "armazenamento", "conectividade", "protecao", "alimentacao", "temperatura", "compatibilidade"],
  electronics: ["marca", "modelo", "resolucao", "conectividade", "bluetooth", "wifi", "bateria", "potencia", "voltagem", "certificacoes"],
  software: ["versao", "licenca", "plataformas", "requisitosMinimos", "atualizacoes", "suporte"],
  services: ["duracao", "entrega", "metodologia", "certificacao", "idiomas", "materiaisIncluidos"],
};

const FIELD_LABELS: Record<string, string> = {
  marca: "Marca",
  modelo: "Modelo",
  resolucao: "Resolução",
  sensor: "Sensor",
  lente: "Lente",
  visaoNoturna: "Visão Noturna",
  audio: "Áudio",
  armazenamento: "Armazenamento",
  conectividade: "Conectividade",
  protecao: "Proteção IP",
  alimentacao: "Alimentação",
  temperatura: "Temperatura Operacional",
  compatibilidade: "Compatibilidade",
  garantia: "Garantia",
  peso: "Peso",
  dimensoes: "Dimensões",
  bluetooth: "Bluetooth",
  wifi: "WiFi",
  bateria: "Bateria",
  potencia: "Potência",
  voltagem: "Voltagem",
  certificacoes: "Certificações",
  versao: "Versão",
  licenca: "Licença",
  plataformas: "Plataformas",
  requisitosMinimos: "Requisitos Mínimos",
  atualizacoes: "Atualizações",
  suporte: "Suporte",
  duracao: "Duração",
  entrega: "Modo de Entrega",
  metodologia: "Metodologia",
  certificacao: "Certificação",
  idiomas: "Idiomas",
  materiaisIncluidos: "Materiais Incluídos",
};

interface ProductSpecificationsEditorProps {
  specifications: Record<string, string>;
  onChange: (specs: Record<string, string>) => void;
  suggestedCategory?: string;
  isAutoFilled?: boolean;
}

export function ProductSpecificationsEditor({
  specifications,
  onChange,
  suggestedCategory,
  isAutoFilled = false,
}: ProductSpecificationsEditorProps) {
  const [isOpen, setIsOpen] = useState(Object.keys(specifications).length > 0);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddField, setShowAddField] = useState(false);

  // Determine which predefined fields to suggest based on category
  const getSuggestedFields = () => {
    if (suggestedCategory?.toLowerCase().includes("camera") || 
        suggestedCategory?.toLowerCase().includes("cctv") ||
        suggestedCategory?.toLowerCase().includes("videovigilância") ||
        suggestedCategory?.toLowerCase().includes("segurança")) {
      return PREDEFINED_FIELDS.cameras;
    }
    if (suggestedCategory?.toLowerCase().includes("software") || 
        suggestedCategory?.toLowerCase().includes("digital")) {
      return PREDEFINED_FIELDS.software;
    }
    if (suggestedCategory?.toLowerCase().includes("serviço") || 
        suggestedCategory?.toLowerCase().includes("formação") ||
        suggestedCategory?.toLowerCase().includes("consultoria")) {
      return PREDEFINED_FIELDS.services;
    }
    if (suggestedCategory?.toLowerCase().includes("eletrónic") ||
        suggestedCategory?.toLowerCase().includes("electronic")) {
      return PREDEFINED_FIELDS.electronics;
    }
    return PREDEFINED_FIELDS.default;
  };

  const suggestedFields = getSuggestedFields();
  const existingKeys = Object.keys(specifications);
  const availableFields = suggestedFields.filter(f => !existingKeys.includes(f));

  const handleUpdateField = (key: string, value: string) => {
    onChange({
      ...specifications,
      [key]: value,
    });
  };

  const handleRemoveField = (key: string) => {
    const newSpecs = { ...specifications };
    delete newSpecs[key];
    onChange(newSpecs);
  };

  const handleAddField = () => {
    if (newFieldKey.trim() && newFieldValue.trim()) {
      // Normalize key to camelCase
      const normalizedKey = newFieldKey
        .trim()
        .toLowerCase()
        .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
        .replace(/\s/g, "");
      
      onChange({
        ...specifications,
        [normalizedKey]: newFieldValue.trim(),
      });
      setNewFieldKey("");
      setNewFieldValue("");
      setShowAddField(false);
    }
  };

  const handleAddPredefinedField = (fieldKey: string) => {
    onChange({
      ...specifications,
      [fieldKey]: "",
    });
  };

  const handleStartEdit = (key: string, currentValue: string) => {
    setEditingField(key);
    setEditValue(currentValue);
  };

  const handleSaveEdit = (key: string) => {
    handleUpdateField(key, editValue);
    setEditingField(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const getFieldLabel = (key: string) => {
    return FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
  };

  const specCount = Object.keys(specifications).filter(k => specifications[k]).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Ficha Técnica
            {specCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {specCount}
              </Badge>
            )}
            {isAutoFilled && specCount > 0 && (
              <Badge variant="outline" className="ml-1 text-xs bg-primary/10">
                <Sparkles className="h-3 w-3 mr-1" />
                Auto
              </Badge>
            )}
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        <p className="text-xs text-muted-foreground">
          Especificações técnicas do produto. Podem ser preenchidas automaticamente pela pesquisa SKU ou editadas manualmente.
        </p>

        {/* Existing specifications */}
        {existingKeys.length > 0 ? (
          <Card className="p-3 space-y-3">
            {existingKeys.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Label className="w-32 text-xs text-muted-foreground shrink-0 capitalize">
                  {getFieldLabel(key)}
                </Label>
                {editingField === key ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(key);
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleSaveEdit(key)}
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 text-sm truncate">
                      {specifications[key] || (
                        <span className="text-muted-foreground italic">Por preencher</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                      onClick={() => handleStartEdit(key, specifications[key])}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive opacity-50 hover:opacity-100"
                      onClick={() => handleRemoveField(key)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma especificação adicionada. Use a pesquisa SKU para preencher automaticamente ou adicione campos manualmente.
          </Card>
        )}

        {/* Quick add predefined fields */}
        {availableFields.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Adicionar campo sugerido:</Label>
            <div className="flex flex-wrap gap-1">
              {availableFields.slice(0, 6).map((field) => (
                <Button
                  key={field}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => handleAddPredefinedField(field)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {getFieldLabel(field)}
                </Button>
              ))}
              {availableFields.length > 6 && (
                <Select onValueChange={handleAddPredefinedField}>
                  <SelectTrigger className="h-6 w-auto text-xs">
                    <SelectValue placeholder={`+${availableFields.length - 6} mais`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.slice(6).map((field) => (
                      <SelectItem key={field} value={field}>
                        {getFieldLabel(field)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        {/* Add custom field */}
        {showAddField ? (
          <Card className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Nome do Campo</Label>
                <Input
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  placeholder="ex: Voltagem"
                  className="h-7 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Valor</Label>
                <Input
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  placeholder="ex: 220V"
                  className="h-7 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddField();
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setShowAddField(false);
                  setNewFieldKey("");
                  setNewFieldValue("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddField}
                disabled={!newFieldKey.trim() || !newFieldValue.trim()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>
          </Card>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setShowAddField(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar campo personalizado
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
