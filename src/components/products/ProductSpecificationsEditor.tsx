import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Sparkles,
  Edit2,
  Check,
  X,
  Cpu,
  Camera,
  Wifi,
  Battery,
  HardDrive,
  Shield,
  Thermometer,
  Zap,
  Settings,
  Tag,
  Box,
  Scale,
  Ruler,
  Clock,
  Languages,
  Award,
  Monitor,
  Headphones,
  Eye,
  Radio,
  Gauge,
  Lightbulb,
  Cable,
  CircuitBoard,
} from "lucide-react";

// Icons mapping for specification fields
const FIELD_ICONS: Record<string, React.ReactNode> = {
  marca: <Tag className="h-4 w-4" />,
  brand: <Tag className="h-4 w-4" />,
  modelo: <Box className="h-4 w-4" />,
  model: <Box className="h-4 w-4" />,
  resolucao: <Monitor className="h-4 w-4" />,
  resolution: <Monitor className="h-4 w-4" />,
  sensor: <Cpu className="h-4 w-4" />,
  lente: <Camera className="h-4 w-4" />,
  lens: <Camera className="h-4 w-4" />,
  visaoNoturna: <Eye className="h-4 w-4" />,
  nightVision: <Eye className="h-4 w-4" />,
  audio: <Headphones className="h-4 w-4" />,
  armazenamento: <HardDrive className="h-4 w-4" />,
  storage: <HardDrive className="h-4 w-4" />,
  conectividade: <Wifi className="h-4 w-4" />,
  connectivity: <Wifi className="h-4 w-4" />,
  protecao: <Shield className="h-4 w-4" />,
  protection: <Shield className="h-4 w-4" />,
  alimentacao: <Zap className="h-4 w-4" />,
  power: <Zap className="h-4 w-4" />,
  temperatura: <Thermometer className="h-4 w-4" />,
  temperature: <Thermometer className="h-4 w-4" />,
  compatibilidade: <Settings className="h-4 w-4" />,
  compatibility: <Settings className="h-4 w-4" />,
  garantia: <Award className="h-4 w-4" />,
  warranty: <Award className="h-4 w-4" />,
  peso: <Scale className="h-4 w-4" />,
  weight: <Scale className="h-4 w-4" />,
  dimensoes: <Ruler className="h-4 w-4" />,
  dimensions: <Ruler className="h-4 w-4" />,
  bluetooth: <Radio className="h-4 w-4" />,
  wifi: <Wifi className="h-4 w-4" />,
  bateria: <Battery className="h-4 w-4" />,
  battery: <Battery className="h-4 w-4" />,
  potencia: <Gauge className="h-4 w-4" />,
  voltagem: <Lightbulb className="h-4 w-4" />,
  voltage: <Lightbulb className="h-4 w-4" />,
  certificacoes: <Award className="h-4 w-4" />,
  wdr: <Monitor className="h-4 w-4" />,
  compression: <CircuitBoard className="h-4 w-4" />,
  duracao: <Clock className="h-4 w-4" />,
  idiomas: <Languages className="h-4 w-4" />,
  cable: <Cable className="h-4 w-4" />,
};

// Predefined specification fields based on common product categories
const PREDEFINED_FIELDS: Record<string, string[]> = {
  default: ["marca", "modelo", "garantia", "peso", "dimensoes"],
  cameras: ["marca", "resolucao", "sensor", "lente", "visaoNoturna", "audio", "armazenamento", "conectividade", "protecao", "alimentacao", "temperatura", "compatibilidade", "wdr", "compression"],
  electronics: ["marca", "modelo", "resolucao", "conectividade", "bluetooth", "wifi", "bateria", "potencia", "voltagem", "certificacoes"],
  software: ["versao", "licenca", "plataformas", "requisitosMinimos", "atualizacoes", "suporte"],
  services: ["duracao", "entrega", "metodologia", "certificacao", "idiomas", "materiaisIncluidos"],
};

const FIELD_LABELS: Record<string, string> = {
  // Portuguese
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
  temperatura: "Temperatura",
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
  wdr: "WDR",
  compression: "Compressão",
  // English fallbacks
  brand: "Marca",
  model: "Modelo",
  resolution: "Resolução",
  lens: "Lente",
  nightVision: "Visão Noturna",
  storage: "Armazenamento",
  connectivity: "Conectividade",
  protection: "Proteção IP",
  power: "Alimentação",
  temperature: "Temperatura",
  compatibility: "Compatibilidade",
  warranty: "Garantia",
  weight: "Peso",
  dimensions: "Dimensões",
  battery: "Bateria",
  voltage: "Voltagem",
};

interface ProductSpecificationsEditorProps {
  specifications: Record<string, string>;
  onChange: (specs: Record<string, string>) => void;
  suggestedCategory?: string;
  isAutoFilled?: boolean;
  suggestedSpecs?: Record<string, string>; // New: specs found from search but not yet added
}

export function ProductSpecificationsEditor({
  specifications,
  onChange,
  suggestedCategory,
  isAutoFilled = false,
  suggestedSpecs,
}: ProductSpecificationsEditorProps) {
  const [isOpen, setIsOpen] = useState(Object.keys(specifications).length > 0);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddField, setShowAddField] = useState(false);

  // Open automatically when specs are added
  useEffect(() => {
    if (Object.keys(specifications).length > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [specifications]);

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
  
  // Find new specs from search that aren't in the current specifications
  const newSuggestedSpecs = suggestedSpecs 
    ? Object.entries(suggestedSpecs).filter(([key, value]) => 
        value && !existingKeys.includes(key)
      )
    : [];

  // Only show predefined fields that have no value AND aren't in suggested specs
  const availableFields = suggestedFields.filter(f => 
    !existingKeys.includes(f) && 
    !newSuggestedSpecs.some(([key]) => key === f)
  );

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

  const handleAddSuggestedSpec = (key: string, value: string) => {
    onChange({
      ...specifications,
      [key]: value,
    });
  };

  const handleAddAllSuggestedSpecs = () => {
    const newSpecs = { ...specifications };
    newSuggestedSpecs.forEach(([key, value]) => {
      newSpecs[key] = value;
    });
    onChange(newSpecs);
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

  const getFieldIcon = (key: string) => {
    const normalizedKey = key.toLowerCase();
    return FIELD_ICONS[key] || FIELD_ICONS[normalizedKey] || <Settings className="h-4 w-4" />;
  };

  const specCount = Object.keys(specifications).filter(k => specifications[k]).length;
  const filledSpecs = existingKeys.filter(k => specifications[k]);
  const emptySpecs = existingKeys.filter(k => !specifications[k]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Ficha Técnica
            {specCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {specCount} {specCount === 1 ? "campo" : "campos"}
              </Badge>
            )}
            {isAutoFilled && specCount > 0 && (
              <Badge variant="outline" className="ml-1 text-xs bg-green-500/10 text-green-600 border-green-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Preenchido
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
        {/* New Suggested Specs from Search */}
        {newSuggestedSpecs.length > 0 && (
          <Card className="p-3 border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Especificações Encontradas ({newSuggestedSpecs.length})
                </span>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddAllSuggestedSpecs}
              >
                <Plus className="h-3 w-3 mr-1" />
                Adicionar Todas
              </Button>
            </div>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {newSuggestedSpecs.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background hover:bg-muted/50 transition-colors group"
                  >
                    <div className="text-primary/70">
                      {getFieldIcon(key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground capitalize">
                        {getFieldLabel(key)}
                      </p>
                      <p className="text-sm font-medium truncate">{value}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleAddSuggestedSpec(key, value)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Usar
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Existing specifications - Filled */}
        {filledSpecs.length > 0 && (
          <Card className="p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Especificações Preenchidas
            </p>
            {filledSpecs.map((key) => (
              <div
                key={key}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="text-primary/70">
                  {getFieldIcon(key)}
                </div>
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
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground capitalize">
                        {getFieldLabel(key)}
                      </p>
                      <p className="text-sm font-medium truncate">
                        {specifications[key]}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleStartEdit(key, specifications[key])}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveField(key)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </Card>
        )}

        {/* Empty specs that need filling */}
        {emptySpecs.length > 0 && (
          <Card className="p-3 space-y-2 border-dashed">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Por Preencher
            </p>
            {emptySpecs.map((key) => (
              <div
                key={key}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="text-muted-foreground/50">
                  {getFieldIcon(key)}
                </div>
                {editingField === key ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder={`Insira ${getFieldLabel(key).toLowerCase()}`}
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
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground capitalize">
                        {getFieldLabel(key)}
                      </p>
                      <p className="text-sm italic text-muted-foreground/50">
                        Clique para preencher
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleStartEdit(key, "")}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveField(key)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </Card>
        )}

        {/* No specs yet */}
        {existingKeys.length === 0 && newSuggestedSpecs.length === 0 && (
          <Card className="p-4 text-center text-sm text-muted-foreground border-dashed">
            <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Nenhuma especificação adicionada.</p>
            <p className="text-xs mt-1">
              Use a pesquisa SKU para preencher automaticamente ou adicione campos abaixo.
            </p>
          </Card>
        )}

        <Separator />

        {/* Quick add predefined fields - only show fields that don't have values */}
        {availableFields.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Adicionar campo:</Label>
            <div className="flex flex-wrap gap-1">
              {availableFields.slice(0, 5).map((field) => (
                <Button
                  key={field}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleAddPredefinedField(field)}
                >
                  {getFieldIcon(field)}
                  {getFieldLabel(field)}
                </Button>
              ))}
              {availableFields.length > 5 && (
                <Select onValueChange={handleAddPredefinedField}>
                  <SelectTrigger className="h-7 w-auto text-xs gap-1">
                    <Plus className="h-3 w-3" />
                    <SelectValue placeholder={`+${availableFields.length - 5}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.slice(5).map((field) => (
                      <SelectItem key={field} value={field}>
                        <span className="flex items-center gap-2">
                          {getFieldIcon(field)}
                          {getFieldLabel(field)}
                        </span>
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
