import { useState, useEffect } from "react";
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
import { Plus, X, Info, Lock } from "lucide-react";
import { useUpdateManagedField } from "@/hooks/useManagedFields";
import type { 
  ManagedField,
  FormattingConfig,
  FieldPermissions,
  UpdateManagedFieldInput
} from "@/types/fieldManager";
import { 
  FIELD_TYPE_LABELS,
  SECTION_OPTIONS,
  ROLE_OPTIONS 
} from "@/types/fieldManager";

interface EditFieldDialogProps {
  field: ManagedField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFieldDialog({ field, open, onOpenChange }: EditFieldDialogProps) {
  const updateField = useUpdateManagedField();
  
  const [label, setLabel] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [required, setRequired] = useState(false);
  const [isUnique, setIsUnique] = useState(false);
  const [section, setSection] = useState("general");
  const [isVisible, setIsVisible] = useState(true);
  
  // Formatting
  const [autoFormat, setAutoFormat] = useState(true);
  const [formattingConfig, setFormattingConfig] = useState<FormattingConfig>({});

  // Industry labels
  const [industryLabels, setIndustryLabels] = useState<Record<string, string>>({});
  
  // Permissions
  const [permissions, setPermissions] = useState<FieldPermissions>({
    view: [],
    edit: [],
  });

  useEffect(() => {
    if (field) {
      setLabel(field.label);
      setOptions(field.options || []);
      setRequired(field.required);
      setIsUnique(field.is_unique);
      setSection(field.section);
      setIsVisible(field.is_visible);
      setAutoFormat(field.auto_format);
      setFormattingConfig(field.formatting_config || {});
      setIndustryLabels(field.industry_labels || {});
      setPermissions(field.permissions || { view: [], edit: [] });
    }
  }, [field]);

  if (!field) return null;

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
    const input: UpdateManagedFieldInput = {
      id: field.id,
      label,
      options: field.field_type === "select" || field.field_type === "multi_select" ? options : undefined,
      required,
      is_unique: isUnique,
      is_visible: isVisible,
      section,
      auto_format: autoFormat,
      formatting_config: formattingConfig,
      industry_labels: industryLabels,
      permissions,
    };

    await updateField.mutateAsync(input);
    onOpenChange(false);
  };

  const needsOptions = field.field_type === "select" || field.field_type === "multi_select";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Campo
            {field.is_system && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Sistema
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Atualize as configurações do campo "{field.name}".
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="identification" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="identification">Identificação</TabsTrigger>
            <TabsTrigger value="formatting">Formatação</TabsTrigger>
            <TabsTrigger value="industry">Indústria</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="identification" className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label (Título visível)</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    disabled={field.is_system}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome interno</Label>
                  <Input
                    value={field.internal_name}
                    disabled
                    className="font-mono text-sm bg-muted"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de campo</Label>
                  <Input
                    value={FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secção</Label>
                  <Select value={section} onValueChange={setSection} disabled={field.is_system}>
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

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Campo obrigatório</Label>
                    <p className="text-xs text-muted-foreground">
                      O campo deve ser preenchido ao criar registos
                    </p>
                  </div>
                  <Switch 
                    checked={required} 
                    onCheckedChange={setRequired}
                    disabled={field.is_system}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Valor único</Label>
                    <p className="text-xs text-muted-foreground">
                      Não permite valores duplicados
                    </p>
                  </div>
                  <Switch 
                    checked={isUnique} 
                    onCheckedChange={setIsUnique}
                    disabled={field.is_system}
                  />
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

              {(field.field_type === "phone" || field.field_type === "text") && (
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
                        value={formattingConfig.phonePrefix || "+351"}
                        onChange={(e) => setFormattingConfig({...formattingConfig, phonePrefix: e.target.value})}
                        placeholder="+351"
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              )}

              {field.field_type === "currency" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Normalizar moeda</Label>
                    <Switch 
                      checked={formattingConfig.normalizeCurrency} 
                      onCheckedChange={(v) => setFormattingConfig({...formattingConfig, normalizeCurrency: v})}
                    />
                  </div>
                </div>
              )}

              {field.field_type === "date" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Normalizar datas</Label>
                    <Switch 
                      checked={formattingConfig.normalizeDate} 
                      onCheckedChange={(v) => setFormattingConfig({...formattingConfig, normalizeDate: v})}
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="industry" className="space-y-4 pr-4">
              <div className="p-3 bg-muted/50 rounded-lg flex gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Defina labels alternativos para diferentes tipos de negócio.
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
                  Configure quem pode ver e editar este campo.
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
            disabled={!label.trim() || updateField.isPending}
          >
            {updateField.isPending ? "A guardar..." : "Guardar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
