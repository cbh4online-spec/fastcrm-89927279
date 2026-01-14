import { CrmBlueprint, BlueprintCustomField, BlueprintPipelineStage, BlueprintAutomation } from '@/types/blueprint';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Minus,
  Equal,
  ArrowRight,
  Layers,
  Zap,
  GitCompare,
} from 'lucide-react';

interface BlueprintVersionCompareProps {
  versionA: { version: number; schema: CrmBlueprint };
  versionB: { version: number; schema: CrmBlueprint };
}

type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

interface FieldDiff {
  name: string;
  status: DiffStatus;
  oldValue?: BlueprintCustomField;
  newValue?: BlueprintCustomField;
  changes?: string[];
}

interface StageDiff {
  name: string;
  status: DiffStatus;
  oldValue?: BlueprintPipelineStage;
  newValue?: BlueprintPipelineStage;
  changes?: string[];
}

interface AutomationDiff {
  name: string;
  status: DiffStatus;
  oldValue?: BlueprintAutomation;
  newValue?: BlueprintAutomation;
  changes?: string[];
}

function compareFields(
  oldFields: BlueprintCustomField[] = [],
  newFields: BlueprintCustomField[] = []
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const oldMap = new Map(oldFields.map((f) => [f.name, f]));
  const newMap = new Map(newFields.map((f) => [f.name, f]));

  // Check for removed or modified fields
  for (const [name, oldField] of oldMap) {
    const newField = newMap.get(name);
    if (!newField) {
      diffs.push({ name, status: 'removed', oldValue: oldField });
    } else {
      const changes: string[] = [];
      if (oldField.type !== newField.type) changes.push(`Tipo: ${oldField.type} → ${newField.type}`);
      if (oldField.required !== newField.required) changes.push(`Obrigatório: ${oldField.required ? 'Sim' : 'Não'} → ${newField.required ? 'Sim' : 'Não'}`);
      if (JSON.stringify(oldField.options) !== JSON.stringify(newField.options)) changes.push('Opções alteradas');
      
      if (changes.length > 0) {
        diffs.push({ name, status: 'modified', oldValue: oldField, newValue: newField, changes });
      } else {
        diffs.push({ name, status: 'unchanged', oldValue: oldField, newValue: newField });
      }
    }
  }

  // Check for added fields
  for (const [name, newField] of newMap) {
    if (!oldMap.has(name)) {
      diffs.push({ name, status: 'added', newValue: newField });
    }
  }

  return diffs.sort((a, b) => {
    const order = { removed: 0, modified: 1, added: 2, unchanged: 3 };
    return order[a.status] - order[b.status];
  });
}

function compareStages(
  oldStages: BlueprintPipelineStage[] = [],
  newStages: BlueprintPipelineStage[] = []
): StageDiff[] {
  const diffs: StageDiff[] = [];
  const oldMap = new Map(oldStages.map((s) => [s.name, s]));
  const newMap = new Map(newStages.map((s) => [s.name, s]));

  for (const [name, oldStage] of oldMap) {
    const newStage = newMap.get(name);
    if (!newStage) {
      diffs.push({ name, status: 'removed', oldValue: oldStage });
    } else {
      const changes: string[] = [];
      if (oldStage.color !== newStage.color) changes.push(`Cor: ${oldStage.color} → ${newStage.color}`);
      if (oldStage.position !== newStage.position) changes.push(`Posição: ${oldStage.position} → ${newStage.position}`);
      
      if (changes.length > 0) {
        diffs.push({ name, status: 'modified', oldValue: oldStage, newValue: newStage, changes });
      } else {
        diffs.push({ name, status: 'unchanged', oldValue: oldStage, newValue: newStage });
      }
    }
  }

  for (const [name, newStage] of newMap) {
    if (!oldMap.has(name)) {
      diffs.push({ name, status: 'added', newValue: newStage });
    }
  }

  return diffs.sort((a, b) => {
    const order = { removed: 0, modified: 1, added: 2, unchanged: 3 };
    return order[a.status] - order[b.status];
  });
}

function compareAutomations(
  oldAutomations: BlueprintAutomation[] = [],
  newAutomations: BlueprintAutomation[] = []
): AutomationDiff[] {
  const diffs: AutomationDiff[] = [];
  const oldMap = new Map(oldAutomations.map((a) => [a.name, a]));
  const newMap = new Map(newAutomations.map((a) => [a.name, a]));

  for (const [name, oldAuto] of oldMap) {
    const newAuto = newMap.get(name);
    if (!newAuto) {
      diffs.push({ name, status: 'removed', oldValue: oldAuto });
    } else {
      const changes: string[] = [];
      if (oldAuto.trigger !== newAuto.trigger) changes.push(`Trigger: ${oldAuto.trigger} → ${newAuto.trigger}`);
      if (JSON.stringify(oldAuto.conditions) !== JSON.stringify(newAuto.conditions)) changes.push('Condições alteradas');
      if (JSON.stringify(oldAuto.actions) !== JSON.stringify(newAuto.actions)) changes.push('Ações alteradas');
      
      if (changes.length > 0) {
        diffs.push({ name, status: 'modified', oldValue: oldAuto, newValue: newAuto, changes });
      } else {
        diffs.push({ name, status: 'unchanged', oldValue: oldAuto, newValue: newAuto });
      }
    }
  }

  for (const [name, newAuto] of newMap) {
    if (!oldMap.has(name)) {
      diffs.push({ name, status: 'added', newValue: newAuto });
    }
  }

  return diffs.sort((a, b) => {
    const order = { removed: 0, modified: 1, added: 2, unchanged: 3 };
    return order[a.status] - order[b.status];
  });
}

function DiffStatusIcon({ status }: { status: DiffStatus }) {
  switch (status) {
    case 'added':
      return <Plus className="h-4 w-4 text-green-500" />;
    case 'removed':
      return <Minus className="h-4 w-4 text-red-500" />;
    case 'modified':
      return <ArrowRight className="h-4 w-4 text-amber-500" />;
    default:
      return <Equal className="h-4 w-4 text-muted-foreground" />;
  }
}

function DiffStatusBadge({ status }: { status: DiffStatus }) {
  const variants: Record<DiffStatus, { label: string; className: string }> = {
    added: { label: 'Adicionado', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    removed: { label: 'Removido', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    modified: { label: 'Modificado', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
    unchanged: { label: 'Sem alterações', className: 'bg-muted text-muted-foreground' },
  };

  const { label, className } = variants[status];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

export function BlueprintVersionCompare({ versionA, versionB }: BlueprintVersionCompareProps) {
  const fieldDiffs = compareFields(versionA.schema.customFields, versionB.schema.customFields);
  const stageDiffs = compareStages(versionA.schema.pipelineStages, versionB.schema.pipelineStages);
  const automationDiffs = compareAutomations(versionA.schema.automations, versionB.schema.automations);

  const changedFields = fieldDiffs.filter((d) => d.status !== 'unchanged').length;
  const changedStages = stageDiffs.filter((d) => d.status !== 'unchanged').length;
  const changedAutomations = automationDiffs.filter((d) => d.status !== 'unchanged').length;
  const totalChanges = changedFields + changedStages + changedAutomations;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          <span className="font-medium">
            Versão {versionA.version} → Versão {versionB.version}
          </span>
        </div>
        <Badge variant="secondary">
          {totalChanges} {totalChanges === 1 ? 'alteração' : 'alterações'}
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 border rounded-lg text-center">
          <div className="text-2xl font-bold text-primary">{changedFields}</div>
          <div className="text-xs text-muted-foreground">Campos alterados</div>
        </div>
        <div className="p-3 border rounded-lg text-center">
          <div className="text-2xl font-bold text-primary">{changedStages}</div>
          <div className="text-xs text-muted-foreground">Etapas alteradas</div>
        </div>
        <div className="p-3 border rounded-lg text-center">
          <div className="text-2xl font-bold text-primary">{changedAutomations}</div>
          <div className="text-xs text-muted-foreground">Automações alteradas</div>
        </div>
      </div>

      <ScrollArea className="h-[350px]">
        <div className="space-y-4 pr-4">
          {/* Custom Fields Diff */}
          {fieldDiffs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4" />
                <span className="font-medium">Campos Personalizados</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {fieldDiffs.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {fieldDiffs.map((diff, i) => (
                  <div
                    key={i}
                    className={`p-3 border rounded-lg ${
                      diff.status === 'added' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' :
                      diff.status === 'removed' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' :
                      diff.status === 'modified' ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950' :
                      ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <DiffStatusIcon status={diff.status} />
                      <span className="font-medium">{diff.name}</span>
                      <DiffStatusBadge status={diff.status} />
                    </div>
                    {diff.changes && diff.changes.length > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {diff.changes.map((change, j) => (
                          <div key={j}>• {change}</div>
                        ))}
                      </div>
                    )}
                    {diff.status === 'added' && diff.newValue && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Tipo: {diff.newValue.type} | {diff.newValue.required ? 'Obrigatório' : 'Opcional'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline Stages Diff */}
          {stageDiffs.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="h-4 w-4" />
                  <span className="font-medium">Etapas do Pipeline</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {stageDiffs.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {stageDiffs.map((diff, i) => (
                    <div
                      key={i}
                      className={`p-3 border rounded-lg ${
                        diff.status === 'added' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' :
                        diff.status === 'removed' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' :
                        diff.status === 'modified' ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950' :
                        ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <DiffStatusIcon status={diff.status} />
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: diff.newValue?.color || diff.oldValue?.color }}
                        />
                        <span className="font-medium">{diff.name}</span>
                        <DiffStatusBadge status={diff.status} />
                      </div>
                      {diff.changes && diff.changes.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {diff.changes.map((change, j) => (
                            <div key={j}>• {change}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Automations Diff */}
          {automationDiffs.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">Automações</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {automationDiffs.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {automationDiffs.map((diff, i) => (
                    <div
                      key={i}
                      className={`p-3 border rounded-lg ${
                        diff.status === 'added' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' :
                        diff.status === 'removed' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' :
                        diff.status === 'modified' ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950' :
                        ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <DiffStatusIcon status={diff.status} />
                        <span className="font-medium">{diff.name}</span>
                        <DiffStatusBadge status={diff.status} />
                      </div>
                      {diff.changes && diff.changes.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {diff.changes.map((change, j) => (
                            <div key={j}>• {change}</div>
                          ))}
                        </div>
                      )}
                      {diff.status === 'added' && diff.newValue && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Trigger: {diff.newValue.trigger}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {totalChanges === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Equal className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>As versões são idênticas.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
