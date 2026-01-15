import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OnboardingConfig } from "@/hooks/useIntelligentOnboarding";
import {
  ArrowLeft,
  ArrowRight,
  Workflow,
  Database,
  FormInput,
  Zap,
  BarChart3,
  X,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewStepProps {
  config: OnboardingConfig;
  onUpdateConfig: (config: OnboardingConfig) => void;
  onRemoveStage: (index: number) => void;
  onRemoveCustomField: (entity: keyof OnboardingConfig["customFields"], index: number) => void;
  onRemoveForm: (index: number) => void;
  onRemoveAutomation: (index: number) => void;
  onRemoveKPI: (index: number) => void;
  onApply: () => void;
  onBack: () => void;
}

export function PreviewStep({
  config,
  onRemoveStage,
  onRemoveCustomField,
  onRemoveForm,
  onRemoveAutomation,
  onRemoveKPI,
  onApply,
  onBack,
}: PreviewStepProps) {
  const totalItems =
    config.pipeline.stages.length +
    Object.values(config.customFields).flat().length +
    config.forms.length +
    config.automations.length +
    config.dashboardKPIs.length;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
          <h2 className="text-2xl font-bold text-foreground">
            Configuração Gerada
          </h2>
        </div>
        <p className="text-muted-foreground">
          Revê e edita antes de aplicar. {totalItems} itens serão criados.
        </p>
      </div>

      {/* AI Explanation */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Explicação da IA
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {config.explanations.general}
        </CardContent>
      </Card>

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="pipeline" className="text-xs sm:text-sm">
            <Workflow className="w-4 h-4 mr-1 hidden sm:block" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="fields" className="text-xs sm:text-sm">
            <Database className="w-4 h-4 mr-1 hidden sm:block" />
            Campos
          </TabsTrigger>
          <TabsTrigger value="forms" className="text-xs sm:text-sm">
            <FormInput className="w-4 h-4 mr-1 hidden sm:block" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="automations" className="text-xs sm:text-sm">
            <Zap className="w-4 h-4 mr-1 hidden sm:block" />
            Auto
          </TabsTrigger>
          <TabsTrigger value="kpis" className="text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4 mr-1 hidden sm:block" />
            KPIs
          </TabsTrigger>
        </TabsList>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">{config.explanations.pipeline}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{config.pipeline.name}</CardTitle>
              <CardDescription>{config.pipeline.stages.length} etapas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {config.pipeline.stages.map((stage, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <div>
                        <p className="font-medium">{stage.name}</p>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveStage(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fields Tab */}
        <TabsContent value="fields" className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">{config.explanations.customFields}</p>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {(["leads", "contacts", "companies", "opportunities"] as const).map((entity) => (
                <Card key={entity}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base capitalize flex items-center justify-between">
                      {entity === "leads" && "Leads"}
                      {entity === "contacts" && "Contactos"}
                      {entity === "companies" && "Empresas"}
                      {entity === "opportunities" && "Oportunidades"}
                      <Badge variant="secondary">{config.customFields[entity].length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {config.customFields[entity].length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum campo adicional</p>
                    ) : (
                      <div className="space-y-2">
                        {config.customFields[entity].map((field, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{field.name}</p>
                                <Badge variant="outline" className="text-xs">
                                  {field.field_type}
                                </Badge>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    Obrigatório
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{field.reason}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onRemoveCustomField(entity, index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">{config.explanations.forms}</p>
          </div>

          <div className="space-y-3">
            {config.forms.map((form, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{form.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onRemoveForm(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription>{form.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {form.fields.map((field, fIndex) => (
                      <Badge key={fIndex} variant="secondary">
                        {field.name}
                        {field.required && " *"}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">{config.explanations.automations}</p>
          </div>

          <div className="space-y-3">
            {config.automations.map((automation, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      {automation.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onRemoveAutomation(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription>{automation.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Quando: </span>
                    <span className="font-medium">{automation.trigger}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Ações: </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {automation.actions.map((action, aIndex) => (
                        <Badge key={aIndex} variant="outline" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="space-y-3">
            {config.dashboardKPIs.map((kpi, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full",
                      kpi.priority === "high" && "bg-red-500",
                      kpi.priority === "medium" && "bg-amber-500",
                      kpi.priority === "low" && "bg-green-500"
                    )}
                  />
                  <div>
                    <p className="font-medium">{kpi.name}</p>
                    <p className="text-sm text-muted-foreground">{kpi.metric}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onRemoveKPI(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar e Editar
        </Button>
        <Button onClick={onApply} size="lg" className="gap-2">
          Aplicar Configuração
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
