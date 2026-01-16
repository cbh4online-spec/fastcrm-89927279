import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Lock,
} from "lucide-react";
import { ConflictPolicy } from "@/types/import";

interface ConflictPolicyStepProps {
  conflictPolicy: ConflictPolicy;
  criticalFields: string[];
  onPolicyChange: (policy: ConflictPolicy) => void;
  onCriticalFieldsChange: (fields: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const POLICY_OPTIONS: { id: ConflictPolicy; label: string; description: string; icon: React.ElementType; badge?: string }[] = [
  {
    id: 'fill_empty',
    label: 'Só preencher vazios',
    description: 'Mantém dados existentes. Só preenche campos que estejam vazios.',
    icon: Shield,
    badge: 'Seguro',
  },
  {
    id: 'always_update',
    label: 'Atualizar sempre',
    description: 'Dados do ficheiro substituem os existentes. Usa com cuidado.',
    icon: AlertTriangle,
  },
  {
    id: 'ask',
    label: 'Perguntar por conflito',
    description: 'Mostra um diálogo para cada conflito encontrado em campos críticos.',
    icon: HelpCircle,
    badge: 'Recomendado',
  },
];

const AVAILABLE_CRITICAL_FIELDS = [
  { field: 'name', label: 'Nome' },
  { field: 'email', label: 'Email' },
  { field: 'phone', label: 'Telefone' },
  { field: 'tax_id', label: 'NIF' },
  { field: 'address', label: 'Morada' },
  { field: 'company', label: 'Empresa' },
];

const DEFAULT_CRITICAL_FIELDS = ['email', 'phone', 'tax_id', 'name'];

export function ConflictPolicyStep({
  conflictPolicy,
  criticalFields,
  onPolicyChange,
  onCriticalFieldsChange,
  onNext,
  onBack,
}: ConflictPolicyStepProps) {
  const handleCriticalFieldToggle = (field: string) => {
    if (criticalFields.includes(field)) {
      onCriticalFieldsChange(criticalFields.filter((f) => f !== field));
    } else {
      onCriticalFieldsChange([...criticalFields, field]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Política de Conflitos
        </CardTitle>
        <CardDescription>
          Escolhe o nível de segurança para evitar sobrescrever dados importantes.
          Duplicados são identificados por NIF ou email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup
          value={conflictPolicy}
          onValueChange={(value) => onPolicyChange(value as ConflictPolicy)}
          className="space-y-3"
        >
          {POLICY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = conflictPolicy === option.id;

            return (
              <div
                key={option.id}
                className={`relative flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => onPolicyChange(option.id)}
              >
                <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-5 w-5 ${
                    option.id === 'always_update' ? 'text-yellow-600' :
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={option.id} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    {option.badge && (
                      <Badge
                        variant={option.badge === 'Recomendado' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {option.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>

        {/* Critical fields selection (only shown for 'ask' policy) */}
        {conflictPolicy === 'ask' && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h4 className="font-medium text-sm">Campos críticos</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Conflitos nestes campos requerem confirmação manual:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_CRITICAL_FIELDS.map((item) => {
                const isChecked = criticalFields.includes(item.field);
                return (
                  <div
                    key={item.field}
                    className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                      isChecked ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted'
                    }`}
                    onClick={() => handleCriticalFieldToggle(item.field)}
                  >
                    <Checkbox
                      id={`critical-${item.field}`}
                      checked={isChecked}
                      onCheckedChange={() => handleCriticalFieldToggle(item.field)}
                    />
                    <Label
                      htmlFor={`critical-${item.field}`}
                      className="text-sm cursor-pointer"
                    >
                      {item.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Warning for always_update */}
        {conflictPolicy === 'always_update' && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-700">
                Atenção: Dados existentes podem ser perdidos
              </p>
              <p className="text-muted-foreground">
                Esta opção substitui todos os dados existentes pelos novos. Certifica-te que é o que pretendes.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={onNext}>
            Continuar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
