import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GitBranch, ArrowRight } from 'lucide-react';
import { ConditionalRule, SmartFormField } from '@/types/smartForm';

interface ConditionalLogicPanelProps {
  rules: ConditionalRule[];
  fields: SmartFormField[];
  onChange: (rules: ConditionalRule[]) => void;
}

export function ConditionalLogicPanel({ rules, fields, onChange }: ConditionalLogicPanelProps) {
  const handleAdd = () => {
    if (fields.length < 2) return;
    onChange([...rules, {
      id: `cond_${Date.now()}`,
      sourceFieldId: fields[0]?.id || '',
      condition: 'equals',
      value: '',
      action: 'show',
      targetFieldId: fields[1]?.id || '',
    }]);
  };

  const handleUpdate = (index: number, updates: Partial<ConditionalRule>) => {
    onChange(rules.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  const handleRemove = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const getFieldLabel = (fieldId: string) => fields.find(f => f.id === fieldId)?.label || fieldId;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Lógica Condicional
          </CardTitle>
          <CardDescription>Mostra ou esconde campos baseado em respostas</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={handleAdd} disabled={fields.length < 2}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Regra
        </Button>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem regras condicionais. Adiciona regras para criar formulários dinâmicos.
          </p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id} className="p-3 rounded-lg border space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">SE</Badge>
                  <span>campo responde a condição</span>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="outline" className="text-xs">ENTÃO</Badge>
                  <span>executa ação</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-destructive" onClick={() => handleRemove(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {/* Source Field */}
                  <Select value={rule.sourceFieldId} onValueChange={(v) => handleUpdate(index, { sourceFieldId: v })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Condition */}
                  <Select value={rule.condition} onValueChange={(v) => handleUpdate(index, { condition: v as ConditionalRule['condition'] })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Igual a</SelectItem>
                      <SelectItem value="not_equals">Diferente de</SelectItem>
                      <SelectItem value="contains">Contém</SelectItem>
                      <SelectItem value="greater_than">Maior que</SelectItem>
                      <SelectItem value="less_than">Menor que</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Value */}
                  <Input
                    value={String(rule.value)}
                    onChange={(e) => handleUpdate(index, { value: e.target.value })}
                    placeholder="Valor"
                    className="text-xs"
                  />

                  {/* Action + Target */}
                  <div className="flex gap-1">
                    <Select value={rule.action} onValueChange={(v) => handleUpdate(index, { action: v as ConditionalRule['action'] })}>
                      <SelectTrigger className="text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="show">Mostrar</SelectItem>
                        <SelectItem value="hide">Esconder</SelectItem>
                        <SelectItem value="require">Obrigar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={rule.targetFieldId} onValueChange={(v) => handleUpdate(index, { targetFieldId: v })}>
                      <SelectTrigger className="text-xs flex-1">
                        <SelectValue placeholder="Campo alvo" />
                      </SelectTrigger>
                      <SelectContent>
                        {fields.filter(f => f.id !== rule.sourceFieldId).map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
