import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CrmBlueprint,
  BlueprintCustomField,
  BlueprintSection,
  BlueprintPipelineStage,
  BlueprintAutomation,
  BlueprintDedupeRule,
} from '@/types/blueprint';
import {
  Layers,
  Grid3X3,
  Workflow,
  Zap,
  Key,
  ArrowRight,
  CheckCircle2,
  Circle,
  Star,
} from 'lucide-react';

interface BlueprintPreviewProps {
  blueprint: CrmBlueprint;
}

export function BlueprintPreview({ blueprint }: BlueprintPreviewProps) {
  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-6 pr-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">{blueprint.name}</h3>
            <Badge variant={blueprint.metadata.status === 'draft' ? 'secondary' : 'default'}>
              v{blueprint.version} • {blueprint.metadata.status}
            </Badge>
          </div>
          {blueprint.description && (
            <p className="text-sm text-muted-foreground">{blueprint.description}</p>
          )}
          <Badge variant="outline">{blueprint.entityType.toUpperCase()}</Badge>
        </div>

        <Separator />

        {/* Custom Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Campos Personalizados
              <Badge variant="secondary">{blueprint.customFields.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {blueprint.customFields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 border rounded text-sm"
                >
                  <span className="font-medium truncate flex-1">{field.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {field.type}
                  </Badge>
                  {field.required && (
                    <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Secções de Layout
              <Badge variant="secondary">{blueprint.sections.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blueprint.sections.map((section, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="font-medium mb-1">{section.name}</div>
                  {section.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {section.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {section.fields.map((field, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Stages */}
        {blueprint.pipelineStages && blueprint.pipelineStages.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Etapas do Pipeline
                <Badge variant="secondary">{blueprint.pipelineStages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {blueprint.pipelineStages
                  .sort((a, b) => a.position - b.position)
                  .map((stage, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="px-3 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap"
                        style={{ backgroundColor: stage.color }}
                      >
                        {stage.name}
                      </div>
                      {index < blueprint.pipelineStages!.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Automations */}
        {blueprint.automations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Automações Sugeridas
                <Badge variant="secondary">{blueprint.automations.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blueprint.automations.map((automation, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium mb-1">{automation.name}</div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {automation.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">Trigger: {automation.trigger}</Badge>
                      <Badge variant="secondary">
                        {automation.actions.length} ação(ões)
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dedupe Rules */}
        {blueprint.dedupeRules.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4" />
                Regras de Deduplicação
                <Badge variant="secondary">{blueprint.dedupeRules.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {blueprint.dedupeRules
                  .sort((a, b) => a.priority - b.priority)
                  .map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{rule.priority}
                        </Badge>
                        <span className="font-medium">{rule.field}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {rule.matchType}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
