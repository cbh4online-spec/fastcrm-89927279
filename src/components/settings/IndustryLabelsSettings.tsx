import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  GraduationCap,
  Heart,
  Briefcase,
  Megaphone,
  Settings2,
  Sparkles,
  Save,
  RefreshCw,
} from "lucide-react";
import { IndustryType, INDUSTRY_PRESETS, ENTITY_FIELDS, ImportEntityType } from "@/types/import";
import { useIndustryLabels, useSetIndustryLabels } from "@/hooks/useIndustryLabels";

interface IndustryLabelsSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INDUSTRY_OPTIONS: { id: IndustryType; label: string; icon: React.ElementType }[] = [
  { id: 'default', label: 'Padrão', icon: Settings2 },
  { id: 'formacao', label: 'Formação / Escola', icon: GraduationCap },
  { id: 'saude', label: 'Saúde / Clínica', icon: Heart },
  { id: 'servicos', label: 'Serviços', icon: Briefcase },
  { id: 'agencia', label: 'Agência', icon: Megaphone },
  { id: 'custom', label: 'Personalizado', icon: Sparkles },
];

const ENTITY_TYPES: { id: ImportEntityType; label: string }[] = [
  { id: 'contacts', label: 'Contactos' },
  { id: 'companies', label: 'Empresas' },
  { id: 'leads', label: 'Leads' },
  { id: 'products', label: 'Produtos' },
  { id: 'opportunities', label: 'Oportunidades' },
];

export function IndustryLabelsSettings({ open, onOpenChange }: IndustryLabelsSettingsProps) {
  const { data: currentLabels, isLoading } = useIndustryLabels();
  const setIndustryLabels = useSetIndustryLabels();

  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>(
    currentLabels?.industry_type || 'default'
  );
  const [entityLabels, setEntityLabels] = useState<Record<string, string>>({});
  const [fieldLabels, setFieldLabels] = useState<Record<string, Record<string, string>>>({});
  const [activeEntityTab, setActiveEntityTab] = useState<ImportEntityType>('contacts');

  // Initialize state when current labels load
  useState(() => {
    if (currentLabels) {
      setSelectedIndustry(currentLabels.industry_type);
      setEntityLabels(currentLabels.entity_labels as Record<string, string> || {});
      setFieldLabels(currentLabels.field_labels || {});
    }
  });

  const getPresetLabel = (entityType: string) => {
    const preset = INDUSTRY_PRESETS[selectedIndustry];
    return preset?.[entityType as keyof typeof preset] as string || INDUSTRY_PRESETS.default[entityType as keyof typeof INDUSTRY_PRESETS.default] as string;
  };

  const getEntityLabel = (entityType: string) => {
    return entityLabels[entityType] || getPresetLabel(entityType);
  };

  const getFieldLabel = (entityType: string, fieldName: string, defaultLabel: string) => {
    return fieldLabels[entityType]?.[fieldName] || 
           INDUSTRY_PRESETS[selectedIndustry]?.fieldLabels?.[entityType]?.[fieldName] ||
           defaultLabel;
  };

  const handleEntityLabelChange = (entityType: string, value: string) => {
    setEntityLabels(prev => ({
      ...prev,
      [entityType]: value,
    }));
  };

  const handleFieldLabelChange = (entityType: string, fieldName: string, value: string) => {
    setFieldLabels(prev => ({
      ...prev,
      [entityType]: {
        ...prev[entityType],
        [fieldName]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      await setIndustryLabels.mutateAsync({
        industryType: selectedIndustry,
        entityLabels: entityLabels as any,
        fieldLabels,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving labels:", error);
    }
  };

  const handleReset = () => {
    setEntityLabels({});
    setFieldLabels({});
    toast.success("Labels resetados para o modelo selecionado");
  };

  const entityFields = ENTITY_FIELDS[activeEntityTab] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Modelo de Negócio
          </DialogTitle>
          <DialogDescription>
            Personaliza a terminologia usada no CRM. Isto altera apenas os títulos exibidos,
            não afeta o modelo de dados.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Industry Selection */}
            <div className="space-y-3">
              <Label>Tipo de Negócio</Label>
              <RadioGroup
                value={selectedIndustry}
                onValueChange={(v) => setSelectedIndustry(v as IndustryType)}
                className="grid grid-cols-3 gap-2"
              >
                {INDUSTRY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedIndustry === option.id;
                  return (
                    <div
                      key={option.id}
                      className={`relative flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setSelectedIndustry(option.id)}
                    >
                      <RadioGroupItem value={option.id} id={option.id} className="sr-only" />
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Entity Labels */}
            <div className="space-y-3">
              <Label>Nomes das Entidades</Label>
              <div className="grid grid-cols-2 gap-3">
                {ENTITY_TYPES.map((entity) => (
                  <div key={entity.id} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {entity.label} (padrão)
                    </Label>
                    <Input
                      value={getEntityLabel(entity.id)}
                      onChange={(e) => handleEntityLabelChange(entity.id, e.target.value)}
                      placeholder={getPresetLabel(entity.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Field Labels */}
            <div className="space-y-3">
              <Label>Nomes dos Campos</Label>
              <Tabs value={activeEntityTab} onValueChange={(v) => setActiveEntityTab(v as ImportEntityType)}>
                <TabsList className="w-full justify-start">
                  {ENTITY_TYPES.slice(0, 4).map((entity) => (
                    <TabsTrigger key={entity.id} value={entity.id} className="text-xs">
                      {getEntityLabel(entity.id)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value={activeEntityTab} className="mt-3">
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-2 gap-3 pr-4">
                      {entityFields.slice(0, 10).map((field) => (
                        <div key={field.field} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            {field.label} (padrão)
                          </Label>
                          <Input
                            value={getFieldLabel(activeEntityTab, field.field, field.label)}
                            onChange={(e) => handleFieldLabelChange(activeEntityTab, field.field, e.target.value)}
                            placeholder={field.label}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Pré-visualização</p>
              <div className="flex flex-wrap gap-2">
                {ENTITY_TYPES.map((entity) => (
                  <Badge key={entity.id} variant="secondary" className="font-normal">
                    {getEntityLabel(entity.id)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between border-t pt-4 mt-4">
          <Button variant="ghost" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={setIndustryLabels.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
