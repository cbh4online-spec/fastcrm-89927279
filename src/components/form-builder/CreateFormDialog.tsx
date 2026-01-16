import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  Building2,
  Target,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Stethoscope,
  Briefcase,
  Building,
} from "lucide-react";
import { useCreateForm, useFormTemplates } from "@/hooks/useFormBuilder";
import { 
  type FormType, 
  type TargetEntity,
  FORM_TYPE_LABELS,
  TARGET_ENTITY_LABELS,
  INDUSTRY_TEMPLATES,
} from "@/types/formBuilder";

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FORM_TYPE_ICONS: Record<FormType, React.ReactNode> = {
  lead: <UserPlus className="h-5 w-5" />,
  contact: <Building2 className="h-5 w-5" />,
  opportunity: <Target className="h-5 w-5" />,
  custom: <FileText className="h-5 w-5" />,
};

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  default: <FileText className="h-5 w-5" />,
  formacao: <GraduationCap className="h-5 w-5" />,
  saude: <Stethoscope className="h-5 w-5" />,
  servicos: <Briefcase className="h-5 w-5" />,
  agencia: <Building className="h-5 w-5" />,
};

export function CreateFormDialog({ open, onOpenChange }: CreateFormDialogProps) {
  const navigate = useNavigate();
  const createForm = useCreateForm();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formType, setFormType] = useState<FormType>("lead");
  const [targetEntity, setTargetEntity] = useState<TargetEntity>("contact");
  const [industryType, setIndustryType] = useState("default");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  const { data: templates = [] } = useFormTemplates(industryType);

  const handleCreate = async () => {
    const form = await createForm.mutateAsync({
      name,
      description,
      form_type: formType,
      target_entity: targetEntity,
      industry_type: industryType,
      template_id: selectedTemplateId || undefined,
    });

    onOpenChange(false);
    navigate(`/dashboard/forms/${form.id}`);
    
    // Reset form
    setStep(1);
    setName("");
    setDescription("");
    setFormType("lead");
    setTargetEntity("contact");
    setIndustryType("default");
    setSelectedTemplateId(null);
    setUseAI(false);
    setAiPrompt("");
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formType !== undefined;
      case 2: return industryType !== undefined;
      case 3: return name.trim().length > 0;
      default: return false;
    }
  };

  const formTypes: FormType[] = ['lead', 'contact', 'opportunity', 'custom'];
  const targetEntities: TargetEntity[] = ['contact', 'company', 'lead', 'opportunity'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Criar Novo Formulário</DialogTitle>
          <DialogDescription>
            {step === 1 && "Escolhe o tipo de formulário que queres criar."}
            {step === 2 && "Seleciona um modelo ou começa do zero."}
            {step === 3 && "Define as informações básicas do formulário."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full ${
                s === step ? "bg-primary" : s < step ? "bg-primary/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {/* Step 1: Form Type */}
          {step === 1 && (
            <div className="space-y-4">
              <Label>Tipo de formulário</Label>
              <div className="grid grid-cols-2 gap-3">
                {formTypes.map((type) => (
                  <Card
                    key={type}
                    className={`cursor-pointer transition-colors ${
                      formType === type ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setFormType(type)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${formType === type ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {FORM_TYPE_ICONS[type]}
                        </div>
                        <div>
                          <p className="font-medium">{FORM_TYPE_LABELS[type]}</p>
                          <p className="text-xs text-muted-foreground">
                            {type === 'lead' && "Captura novos interessados"}
                            {type === 'contact' && "Cria contactos diretamente"}
                            {type === 'opportunity' && "Regista oportunidades"}
                            {type === 'custom' && "Formulário personalizado"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="pt-4">
                <Label>Destino dos dados</Label>
                <RadioGroup 
                  value={targetEntity} 
                  onValueChange={(v) => setTargetEntity(v as TargetEntity)}
                  className="grid grid-cols-2 gap-2 mt-2"
                >
                  {targetEntities.map((entity) => (
                    <div key={entity} className="flex items-center space-x-2">
                      <RadioGroupItem value={entity} id={entity} />
                      <Label htmlFor={entity} className="cursor-pointer">
                        {TARGET_ENTITY_LABELS[entity]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {step === 2 && (
            <Tabs defaultValue="templates" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="templates">Modelos</TabsTrigger>
                <TabsTrigger value="industry">Por Indústria</TabsTrigger>
                <TabsTrigger value="ai">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Com IA
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="space-y-3 mt-4">
                <Card
                  className={`cursor-pointer transition-colors ${
                    !selectedTemplateId ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTemplateId(null)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Começar do zero</p>
                        <p className="text-xs text-muted-foreground">
                          Formulário vazio para personalizar totalmente
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-colors ${
                      selectedTemplateId === template.id ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {INDUSTRY_ICONS[template.industry_type || 'default']}
                          <div>
                            <p className="font-medium">{template.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        {template.is_system && (
                          <Badge variant="secondary">Sistema</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="industry" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(INDUSTRY_TEMPLATES).map(([key, industry]) => (
                    <Card
                      key={key}
                      className={`cursor-pointer transition-colors ${
                        industryType === key ? "border-primary bg-primary/5" : "hover:border-primary/50"
                      }`}
                      onClick={() => setIndustryType(key)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {INDUSTRY_ICONS[key]}
                          <div>
                            <p className="font-medium">{industry.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {industry.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="ai" className="space-y-4 mt-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Criar com IA</p>
                      <p className="text-sm text-muted-foreground">
                        Descreve o formulário que precisas e a IA irá sugerir os campos, secções e lógica.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descreve o formulário</Label>
                  <Textarea
                    placeholder="Ex: Formulário de inscrição para formação presencial com dados pessoais, escolha de curso e horário preferido..."
                    value={aiPrompt}
                    onChange={(e) => {
                      setAiPrompt(e.target.value);
                      setUseAI(true);
                    }}
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Step 3: Form Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do formulário *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Formulário de Contacto"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Uma breve descrição do propósito deste formulário..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">Resumo</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Tipo: {FORM_TYPE_LABELS[formType]}</p>
                  <p>Destino: {TARGET_ENTITY_LABELS[targetEntity]}</p>
                  <p>Modelo: {selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.name : "Do zero"}</p>
                  {useAI && <p className="text-primary">🤖 Assistência IA ativada</p>}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={!canProceed() || createForm.isPending}>
                {createForm.isPending ? "A criar..." : "Criar Formulário"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
