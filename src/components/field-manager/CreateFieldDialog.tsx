import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X, Info } from "lucide-react";
import { AIAutofillConfig } from "./AIAutofillConfig";
import { useCreateManagedField } from "@/hooks/useManagedFields";
import type { 
  FieldEntityType, 
  FieldType,
  FormattingConfig,
  FieldPermissions,
  WorkspaceRole,
  CreateManagedFieldInput
} from "@/types/fieldManager";
import { 
  ENTITY_TYPE_LABELS, 
  FIELD_TYPE_LABELS,
  SECTION_OPTIONS,
  ROLE_OPTIONS 
} from "@/types/fieldManager";

interface CreateFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEntity?: FieldEntityType;
}

export function CreateFieldDialog({ open, onOpenChange, preselectedEntity }: CreateFieldDialogProps) {
  const createField = useCreateManagedField();
  
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [entityType, setEntityType] = useState<FieldEntityType>(preselectedEntity || "contact");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [required, setRequired] = useState(false);
  const [isUnique, setIsUnique] = useState(false);
  const [section, setSection] = useState("general");
  const [isVisible, setIsVisible] = useState(true);
  
  // Formatting
  const [autoFormat, setAutoFormat] = useState(true);
  const [formattingConfig, setFormattingConfig] = useState<FormattingConfig>({
    normalizePhone: true,
    phonePrefix: "+351",
    normalizeCurrency: true,
    currencySymbol: "€",
    normalizeDate: true,
    dateFormat: "dd/MM/yyyy",
    validateEmail: true,
    validateNif: true,
  });

  // Industry labels
  const [industryLabels, setIndustryLabels] = useState<Record<string, string>>({});
  
  // Permissions
  const [permissions, setPermissions] = useState<FieldPermissions>({
    view: [],
    edit: [],
  });

  useEffect(() => {
    if (preselectedEntity) {
      setEntityType(preselectedEntity);
    }
  }, [preselectedEntity]);

  useEffect(() => {
    // Auto-generate internal name from label
    if (label && !name) {
      const internalName = label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setName(internalName);
    }
  }, [label, name]);

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (option: string) => {
    setOptions(options.filter(o => o !== option));
  };

  const handleSubmit = async () => {
    const input: CreateManagedFieldInput = {
      entity_type: entityType,
      name: label,
      label,
      field_type: fieldType,
      options: fieldType === "select" || fieldType === "multi_select" ? options : undefined,
      required,
      is_unique: isUnique,
      is_visible: isVisible,
      section,
      auto_format: autoFormat,
      formatting_config: formattingConfig,
      industry_labels: industryLabels,
      permissions,
      origin: 'manual',
    };

    await createField.mutateAsync(input);
    
    // Reset form
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setName("");
    setLabel("");
    setEntityType(preselectedEntity || "contact");
    setFieldType("text");
    setOptions([]);
    setNewOption("");
    setRequired(false);
    setIsUnique(false);
    setSection("general");
    setIsVisible(true);
    setAutoFormat(true);
    setIndustryLabels({});
    setPermissions({ view: [], edit: [] });
  };

  const entityTypes: FieldEntityType[] = ['contact', 'company', 'opportunity', 'product', 'financial', 'proposal', 'document'];
  const fieldTypes: FieldType[] = ['text', 'number', 'currency', 'date', 'email', 'phone', 'url', 'boolean', 'select', 'multi_select', 'relationship'];

  const needsOptions = fieldType === "select" || fieldType === "multi_select";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Criar Novo Campo</DialogTitle>
          <DialogDescription>
            Configure um campo personalizado para o seu CRM.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="identification" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identification">Identificação</TabsTrigger>
            <TabsTrigger value="formatting">Formatação</TabsTrigger>
            <TabsTrigger value="ai">IA</TabsTrigger>
            <TabsTrigger value="industry">Indústria</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="identification" className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label (Título visível)*</Label>
                  <Input
                    id="label"
                    placeholder="Ex: Paciente, Aluno, Cliente"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome interno (auto-gerado)</Label>
                  <Input
                    id="name"
                    placeholder="nome_interno"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entidade alvo*</Label>
                  <Select value={entityType} onValueChange={(v) => setEntityType(v as FieldEntityType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entityTypes.map(entity => (
                        <SelectItem key={entity} value={entity}>
                          {ENTITY_TYPE_LABELS[entity]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de campo*</Label>
                  <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {FIELD_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {needsOptions && (
                <div className="space-y-2">
                  <Label>Opções</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar opção"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOption())}
                    />
                    <Button type="button" variant="outline" onClick={handleAddOption}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {options.map(option => (
                      <Badge key={option} variant="secondary" className="gap-1">
                        {option}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveOption(option)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Secção</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Campo obrigatório</Label>
                    <p className="text-xs text-muted-foreground">
                      O campo deve ser preenchido ao criar registos
                    </p>
                  </div>
                  <Switch checked={required} onCheckedChange={setRequired} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Valor único</Label>
                    <p className="text-xs text-muted-foreground">
                      Não permite valores duplicados
                    </p>
                  </div>
                  <Switch checked={isUnique} onCheckedChange={setIsUnique} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Visível</Label>
                    <p className="text-xs text-muted-foreground">
                      Mostrar este campo nas fichas
                    </p>
                  </div>
                  <Switch checked={isVisible} onCheckedChange={setIsVisible} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="formatting" className="space-y-4 pr-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Auto-formatação</Label>
                  <p className="text-xs text-muted-foreground">
                    O sistema sugere a melhor formatação, mas tu tens sempre controlo.
                  </p>
                </div>
                <Switch checked={autoFormat} onCheckedChange={setAutoFormat} />
              </div>

              <Separator />

              {(fieldType === "phone" || fieldType === "text") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Normalizar telefone</Label>
                    <Switch 
                      checked={formattingConfig.normalizePhone} 
                      onCheckedChange={(v) => setFormattingConfig({...formattingConfig, normalizePhone: v})}
                    />
                  </div>
                  {formattingConfig.normalizePhone && (
                    <div className="space-y-2 pl-4">
                      <Label className="text-sm">Prefixo</Label>
                      <Input 
                        value={formattingConfig.phonePrefix}
                        onChange={(e) => setFormattingConfig({...formattingConfig, phonePrefix: e.target.value})}
                        placeholder="+351"
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              )}

              {fieldType === "currency" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Normalizar moeda</Label>
                    <Switch 
                      checked={formattingConfig.normalizeCurrency} 
                      onCheckedChange={(v) => setFormattingConfig({...formattingConfig, normalizeCurrency: v})}
                    />
                  </div>
                  {formattingConfig.normalizeCurrency && (
                    <div className="space-y-2 pl-4">
                      <Label className="text-sm">Símbolo</Label>
                      <Input 
                        value={formattingConfig.currencySymbol}
                        onChange={(e) => setFormattingConfig({...formattingConfig, currencySymbol: e.target.value})}
                        placeholder="€"
                        className="w-20"
                      />
                    </div>
                  )}
                </div>
              )}

              {fieldType === "date" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Normalizar datas</Label>
                    <Switch 
                      checked={formattingConfig.normalizeDate} 
                      onCheckedChange={(v) => setFormattingConfig({...formattingConfig, normalizeDate: v})}
                    />
                  </div>
                  {formattingConfig.normalizeDate && (
                    <div className="space-y-2 pl-4">
                      <Label className="text-sm">Formato</Label>
                      <Select 
                        value={formattingConfig.dateFormat}
                        onValueChange={(v) => setFormattingConfig({...formattingConfig, dateFormat: v})}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                          <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                          <SelectItem value="dd-MM-yyyy">dd-MM-yyyy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {fieldType === "email" && (
                <div className="flex items-center justify-between">
                  <Label>Validar email</Label>
                  <Switch 
                    checked={formattingConfig.validateEmail} 
                    onCheckedChange={(v) => setFormattingConfig({...formattingConfig, validateEmail: v})}
                  />
                </div>
              )}

              {fieldType === "text" && (
                <div className="flex items-center justify-between">
                  <Label>Validar NIF</Label>
                  <Switch 
                    checked={formattingConfig.validateNif} 
                    onCheckedChange={(v) => setFormattingConfig({...formattingConfig, validateNif: v})}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 pr-4">
              <AIAutofillConfig
                config={formattingConfig}
                onChange={setFormattingConfig}
                existingFields={[]}
              />
            </TabsContent>

            <TabsContent value="industry" className="space-y-4 pr-4">
              <div className="p-3 bg-muted/50 rounded-lg flex gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Defina labels alternativos para diferentes tipos de negócio. 
                  Isto afeta apenas a interface, o modelo de dados mantém-se estável.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'formacao', label: 'Formação / Escola' },
                  { key: 'saude', label: 'Saúde / Clínica' },
                  { key: 'servicos', label: 'Serviços' },
                  { key: 'agencia', label: 'Agência' },
                ].map(industry => (
                  <div key={industry.key} className="grid grid-cols-2 gap-4 items-center">
                    <Label>{industry.label}</Label>
                    <Input 
                      placeholder={label || "Label para esta indústria"}
                      value={industryLabels[industry.key] || ""}
                      onChange={(e) => setIndustryLabels({
                        ...industryLabels, 
                        [industry.key]: e.target.value
                      })}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 pr-4">
              <div className="p-3 bg-muted/50 rounded-lg flex gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Nem todos precisam de ver tudo. Configure quem pode ver e editar este campo.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Quem pode ver</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map(role => (
                      <label key={role.value} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                        <Checkbox 
                          checked={permissions.view.includes(role.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPermissions({...permissions, view: [...permissions.view, role.value]});
                            } else {
                              setPermissions({...permissions, view: permissions.view.filter(r => r !== role.value)});
                            }
                          }}
                        />
                        <span className="text-sm">{role.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {permissions.view.length === 0 ? "Sem restrições (todos podem ver)" : `${permissions.view.length} role(s) selecionado(s)`}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Quem pode editar</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map(role => (
                      <label key={role.value} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                        <Checkbox 
                          checked={permissions.edit.includes(role.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPermissions({...permissions, edit: [...permissions.edit, role.value]});
                            } else {
                              setPermissions({...permissions, edit: permissions.edit.filter(r => r !== role.value)});
                            }
                          }}
                        />
                        <span className="text-sm">{role.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {permissions.edit.length === 0 ? "Sem restrições (todos podem editar)" : `${permissions.edit.length} role(s) selecionado(s)`}
                  </p>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!label.trim() || createField.isPending}
          >
            {createField.isPending ? "A criar..." : "Criar Campo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
