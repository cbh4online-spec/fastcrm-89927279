import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Shield } from "lucide-react";
import { useBots, Bot } from "@/hooks/useBots";

const PERMISSIONS = [
  { key: "can_create_task", label: "Criar tarefas", description: "Pode criar tarefas no sistema" },
  { key: "can_enroll_sequence", label: "Inscrever em sequências", description: "Pode inscrever contactos em sequências" },
  { key: "can_send_email", label: "Enviar email", description: "Pode enviar emails diretamente" },
  { key: "can_generate_recovery", label: "Gerar recovery link", description: "Pode gerar links de recuperação" },
  { key: "can_suggest_email", label: "Sugerir email", description: "Pode sugerir conteúdo de email" },
  { key: "requires_human_approval", label: "Requer aprovação humana", description: "Ações necessitam de aprovação" },
] as const;

interface AgentPermissionsEditorProps {
  bot: Bot;
}

export function AgentPermissionsEditor({ bot }: AgentPermissionsEditorProps) {
  const { updateBot } = useBots();
  const [perms, setPerms] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const existing = bot.execution_permissions || {};
    const initial: Record<string, boolean> = {};
    for (const p of PERMISSIONS) {
      initial[p.key] = !!(existing as any)[p.key];
    }
    setPerms(initial);
  }, [bot.id, bot.execution_permissions]);

  const handleSave = () => {
    updateBot.mutate({ id: bot.id, execution_permissions: perms });
  };

  const hasChanges = PERMISSIONS.some(
    (p) => perms[p.key] !== !!(bot.execution_permissions as any)?.[p.key]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4" /> Permissões de Execução
        </CardTitle>
        <CardDescription>Define o que o agente pode fazer autonomamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PERMISSIONS.map((p) => (
          <div key={p.key} className="flex items-start gap-3">
            <Checkbox
              id={p.key}
              checked={perms[p.key] || false}
              onCheckedChange={(checked) =>
                setPerms((prev) => ({ ...prev, [p.key]: !!checked }))
              }
            />
            <div className="space-y-0.5">
              <Label htmlFor={p.key} className="text-sm font-medium cursor-pointer">
                {p.label}
              </Label>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
          </div>
        ))}
        <Button onClick={handleSave} disabled={!hasChanges || updateBot.isPending} size="sm" className="mt-2">
          {updateBot.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          Guardar Permissões
        </Button>
      </CardContent>
    </Card>
  );
}
