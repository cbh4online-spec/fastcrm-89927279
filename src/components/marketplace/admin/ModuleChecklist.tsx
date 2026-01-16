import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { 
  ModuleTemplate, 
  MODULE_LAUNCH_CHECKLIST, 
  CHECKLIST_CATEGORY_LABELS 
} from "@/types/module-template";

interface ModuleChecklistProps {
  template: Partial<ModuleTemplate>;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    checklist: Record<string, boolean>;
  };
}

export function ModuleChecklist({ template, validation }: ModuleChecklistProps) {
  const { checklist } = validation;
  
  // Group checklist items by category
  const groupedItems = MODULE_LAUNCH_CHECKLIST.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof MODULE_LAUNCH_CHECKLIST>);

  // Calculate progress
  const totalRequired = MODULE_LAUNCH_CHECKLIST.filter(item => item.required).length;
  const completedRequired = MODULE_LAUNCH_CHECKLIST.filter(
    item => item.required && checklist[item.id]
  ).length;
  const progress = Math.round((completedRequired / totalRequired) * 100);

  const totalItems = MODULE_LAUNCH_CHECKLIST.length;
  const completedItems = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Checklist de Lançamento</span>
            <Badge variant={progress === 100 ? "default" : "secondary"}>
              {progress}% completo
            </Badge>
          </CardTitle>
          <CardDescription>
            Um módulo só pode ser publicado se todos os itens obrigatórios estiverem completos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Obrigatórios: {completedRequired}/{totalRequired}</span>
              <span>Total: {completedItems}/{totalItems}</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {progress === 100 ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Módulo pronto para publicação!
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Complete os itens em falta para poder publicar.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(groupedItems).map(([category, items]) => {
          const categoryCompleted = items.filter(item => checklist[item.id]).length;
          const categoryTotal = items.length;
          const categoryProgress = Math.round((categoryCompleted / categoryTotal) * 100);

          return (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{CHECKLIST_CATEGORY_LABELS[category] || category}</span>
                  <Badge 
                    variant={categoryProgress === 100 ? "default" : "outline"}
                    className="text-xs"
                  >
                    {categoryCompleted}/{categoryTotal}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {items.map(item => {
                    const isComplete = checklist[item.id];
                    return (
                      <li 
                        key={item.id} 
                        className={`flex items-start gap-2 text-sm ${
                          isComplete ? "text-muted-foreground" : ""
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <Circle className={`mt-0.5 h-4 w-4 shrink-0 ${
                            item.required ? "text-amber-500" : "text-muted-foreground"
                          }`} />
                        )}
                        <div>
                          <span className={isComplete ? "line-through" : ""}>
                            {item.label}
                            {item.required && !isComplete && (
                              <span className="ml-1 text-destructive">*</span>
                            )}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Validation Errors & Warnings */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Problemas Detetados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {validation.errors.map((error, i) => (
              <div key={`error-${i}`} className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ))}
            {validation.warnings.map((warning, i) => (
              <div key={`warning-${i}`} className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                {warning}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
