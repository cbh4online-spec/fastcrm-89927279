import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScopeData {
  objectives: string;
  deliverables: string[];
  exclusions: string[];
  assumptions: string;
}

interface ProposalScopeSectionProps {
  data: ScopeData;
  onChange: (data: ScopeData) => void;
  disabled?: boolean;
}

export function ProposalScopeSection({
  data,
  onChange,
  disabled = false,
}: ProposalScopeSectionProps) {
  const [newDeliverable, setNewDeliverable] = useState("");
  const [newExclusion, setNewExclusion] = useState("");

  const addDeliverable = () => {
    if (!newDeliverable.trim()) return;
    onChange({
      ...data,
      deliverables: [...data.deliverables, newDeliverable.trim()],
    });
    setNewDeliverable("");
  };

  const removeDeliverable = (index: number) => {
    onChange({
      ...data,
      deliverables: data.deliverables.filter((_, i) => i !== index),
    });
  };

  const addExclusion = () => {
    if (!newExclusion.trim()) return;
    onChange({
      ...data,
      exclusions: [...data.exclusions, newExclusion.trim()],
    });
    setNewExclusion("");
  };

  const removeExclusion = (index: number) => {
    onChange({
      ...data,
      exclusions: data.exclusions.filter((_, i) => i !== index),
    });
  };

  const handleKeyPress = (
    e: React.KeyboardEvent,
    action: () => void
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-6">
      {/* Objectives */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Objectivos do Projecto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.objectives}
            onChange={(e) => onChange({ ...data, objectives: e.target.value })}
            placeholder="Descreva os principais objectivos e metas deste projecto..."
            rows={4}
            disabled={disabled}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Defina claramente o que se pretende alcançar com este projecto
          </p>
        </CardContent>
      </Card>

      {/* Deliverables */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Entregáveis
            <Badge variant="secondary" className="ml-auto">
              {data.deliverables.length} itens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new deliverable */}
          <div className="flex gap-2">
            <Input
              value={newDeliverable}
              onChange={(e) => setNewDeliverable(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addDeliverable)}
              placeholder="Adicionar entregável..."
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              size="icon"
              onClick={addDeliverable}
              disabled={disabled || !newDeliverable.trim()}
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Deliverables list */}
          {data.deliverables.length > 0 ? (
            <div className="space-y-2">
              {data.deliverables.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-card",
                    "hover:bg-accent/50 transition-colors group"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="flex-1 text-sm">{item}</span>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDeliverable(index)}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg text-muted-foreground">
              <p className="text-sm">Nenhum entregável adicionado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exclusions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            Exclusões
            <Badge variant="secondary" className="ml-auto">
              {data.exclusions.length} itens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new exclusion */}
          <div className="flex gap-2">
            <Input
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, addExclusion)}
              placeholder="Adicionar exclusão..."
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              size="icon"
              onClick={addExclusion}
              disabled={disabled || !newExclusion.trim()}
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Exclusions list */}
          {data.exclusions.length > 0 ? (
            <div className="space-y-2">
              {data.exclusions.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border bg-card",
                    "hover:bg-accent/50 transition-colors group"
                  )}
                >
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="flex-1 text-sm">{item}</span>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExclusion(index)}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg text-muted-foreground">
              <p className="text-sm">Nenhuma exclusão definida</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assumptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Pressupostos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.assumptions}
            onChange={(e) => onChange({ ...data, assumptions: e.target.value })}
            placeholder="Liste os pressupostos e condições assumidas para a execução do projecto..."
            rows={3}
            disabled={disabled}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Condições que devem ser cumpridas para a execução do projecto
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
