/**
 * Conversation Rules Tab - Manage DO/DONT/STOP/REDIRECT rules
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Shield,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  StopCircle,
  CheckCircle,
} from "lucide-react";
import { useConversationRules } from "@/hooks/useConversationRules";
import { ConversationRuleForm } from "./ConversationRuleForm";
import type { ConversationRule, ConversationRuleType } from "@/types/conversational-engine";
import { RULE_TYPE_OPTIONS } from "@/types/conversational-engine";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const RULE_ICONS: Record<ConversationRuleType, React.ComponentType<{ className?: string }>> = {
  DO: CheckCircle,
  DONT: X,
  STOP: StopCircle,
  REDIRECT: ArrowRight,
};

export function ConversationRulesTab() {
  const { rules, rulesByType, isLoading, createRule, updateRule, deleteRule, toggleActive } = useConversationRules();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ConversationRule | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ConversationRuleType>("DO");

  const handleSave = async (data: Partial<ConversationRule>) => {
    if (editingRule) {
      await updateRule({ id: editingRule.id, ...data });
    } else {
      await createRule(data as any);
    }
    setIsFormOpen(false);
    setEditingRule(null);
  };

  const handleEdit = (rule: ConversationRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteRule(deletingId);
      setDeletingId(null);
    }
  };

  const handleNewRule = (type: ConversationRuleType) => {
    setSelectedType(type);
    setEditingRule(null);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regras de Conversa</h3>
          <p className="text-sm text-muted-foreground">
            Define o que a IA deve FAZER, NÃO FAZER, quando PARAR ou REDIRECIONAR
          </p>
        </div>
      </div>

      {/* Rule Type Tabs */}
      <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as ConversationRuleType)}>
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(RULE_TYPE_OPTIONS) as ConversationRuleType[]).map((type) => {
            const Icon = RULE_ICONS[type];
            const count = rulesByType[type]?.length || 0;
            return (
              <TabsTrigger key={type} value={type} className="gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{RULE_TYPE_OPTIONS[type].label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(RULE_TYPE_OPTIONS) as ConversationRuleType[]).map((type) => {
          const typeRules = rulesByType[type] || [];
          const config = RULE_TYPE_OPTIONS[type];

          return (
            <TabsContent key={type} value={type} className="mt-6">
              {/* Type Description */}
              <Card className={`mb-4 border-l-4`} style={{ borderLeftColor: config.color.replace("bg-", "") }}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                    <Button onClick={() => handleNewRule(type)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Regra
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rules List */}
              {typeRules.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Shield className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      Nenhuma regra "{config.label}" configurada
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {typeRules.map((rule) => (
                    <Card key={rule.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{rule.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                Prioridade: {rule.priority}
                              </Badge>
                              {rule.scope !== "workspace" && (
                                <Badge variant="secondary" className="text-xs">
                                  {rule.scope}
                                </Badge>
                              )}
                            </div>
                            {rule.description && (
                              <p className="text-sm text-muted-foreground mb-2">
                                {rule.description}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge variant="outline" className="text-xs">
                                Condição: {rule.condition_type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Ação: {rule.action_type}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) =>
                                toggleActive({ id: rule.id, isActive: checked })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(rule)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingId(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Form Dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingRule(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Editar Regra" : `Nova Regra: ${RULE_TYPE_OPTIONS[selectedType].label}`}
            </DialogTitle>
            <DialogDescription>
              {RULE_TYPE_OPTIONS[selectedType].description}
            </DialogDescription>
          </DialogHeader>
          <ConversationRuleForm
            rule={editingRule}
            defaultType={selectedType}
            onSave={handleSave}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingRule(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A regra será permanentemente eliminada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
