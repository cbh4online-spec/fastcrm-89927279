import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Pencil,
  Send,
  Zap,
  Clock,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useB2BEmailTemplates, B2B_TEMPLATE_TYPES } from "@/hooks/useB2BEmailTemplates";
import { B2BEmailTemplateEditor } from "./B2BEmailTemplateEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface B2BEmailTemplatesManagerProps {
  workspaceId: string;
}

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  client_invitation: Send,
  order_confirmation: CheckCircle2,
  order_approved: ShieldCheck,
  order_rejected: FileText,
  order_shipped: Send,
  order_delivered: CheckCircle2,
  payment_reminder: Clock,
  welcome_client: Mail,
  reorder_reminder: Zap,
  account_summary: FileText,
};

export function B2BEmailTemplatesManager({ workspaceId }: B2BEmailTemplatesManagerProps) {
  const { templates, isLoading, upsertTemplate, toggleAutoSend, isSaving } =
    useB2BEmailTemplates(workspaceId);
  const [editingType, setEditingType] = useState<string | null>(null);

  const getExistingTemplate = (type: string) =>
    templates.find((t: any) => t.template_type === type);

  const handleSave = async (
    templateType: string,
    data: { subject: string; body: string }
  ) => {
    const existing = getExistingTemplate(templateType);
    const typeDef = B2B_TEMPLATE_TYPES.find((t) => t.type === templateType);
    await upsertTemplate({
      id: existing?.id,
      workspace_id: workspaceId,
      template_type: templateType,
      subject_template: data.subject,
      body_template: data.body,
      is_auto_send: (existing as any)?.is_auto_send ?? true,
      variables_schema: typeDef?.variables || [],
    });
    setEditingType(null);
  };

  const handleToggleAutoSend = async (templateType: string, enabled: boolean) => {
    const existing = getExistingTemplate(templateType);
    if (existing) {
      await toggleAutoSend({ id: existing.id, is_auto_send: enabled });
      toast.success(enabled ? "Envio automático ativado" : "Envio automático desativado");
    } else {
      // Create template with defaults then toggle
      const typeDef = B2B_TEMPLATE_TYPES.find((t) => t.type === templateType)!;
      await upsertTemplate({
        workspace_id: workspaceId,
        template_type: templateType,
        subject_template: typeDef.defaultSubject,
        body_template: typeDef.defaultBody,
        is_auto_send: enabled,
        variables_schema: typeDef.variables,
      });
      toast.success(enabled ? "Template criado e ativado" : "Template criado e desativado");
    }
  };

  const handleSendTest = async (templateType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Não foi possível obter o seu email");
        return;
      }

      const typeDef = B2B_TEMPLATE_TYPES.find((t) => t.type === templateType);
      const existing = getExistingTemplate(templateType);

      const { error } = await supabase.functions.invoke("b2b-send-lifecycle-email", {
        body: {
          workspaceId,
          templateType,
          recipientEmail: user.email,
          variables: {
            client_name: "Cliente Teste",
            order_number: "ENC-TEST-001",
            total: "1.250,00",
            items_count: "5",
            company_name: "A Sua Empresa",
            estimated_delivery: "Em breve",
            tracking_url: "https://exemplo.com/tracking",
            rejection_reason: "Motivo de teste",
            invoice_number: "FT-TEST-001",
            amount: "1.250,00",
            due_date: "31/03/2026",
            portal_url: window.location.origin + "/client/login",
            last_order_date: "01/03/2026",
            top_products: "Produto A, Produto B",
            month: "Março",
            orders_count: "5",
            total_spent: "6.250,00",
          },
          isTest: true,
        },
      });

      if (error) throw error;
      toast.success(`Email de teste enviado para ${user.email}`);
    } catch (err: any) {
      toast.error("Erro ao enviar teste: " + (err.message || "Erro desconhecido"));
    }
  };

  // If editing a specific template
  if (editingType) {
    const typeDef = B2B_TEMPLATE_TYPES.find((t) => t.type === editingType)!;
    const existing = getExistingTemplate(editingType);
    return (
      <B2BEmailTemplateEditor
        templateType={typeDef}
        existingData={
          existing
            ? {
                id: existing.id,
                subject_template: (existing as any).subject_template,
                body_template: (existing as any).body_template,
              }
            : null
        }
        onSave={(data) => handleSave(editingType, data)}
        onClose={() => setEditingType(null)}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Templates de Email Automático
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure e personalize os emails enviados automaticamente em cada fase do ciclo de vida
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          {templates.length} / {B2B_TEMPLATE_TYPES.length} configurados
        </Badge>
      </div>

      <div className="grid gap-3">
        {B2B_TEMPLATE_TYPES.map((typeDef) => {
          const existing = getExistingTemplate(typeDef.type);
          const isCustomized = !!existing;
          const isAutoSend = (existing as any)?.is_auto_send ?? true;
          const sendCount = (existing as any)?.send_count ?? 0;
          const lastSent = (existing as any)?.last_sent_at;
          const Icon = TEMPLATE_ICONS[typeDef.type] || Mail;

          return (
            <Card
              key={typeDef.type}
              className={cn(
                "transition-colors",
                isCustomized && "border-primary/20"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "p-2.5 rounded-lg shrink-0",
                      isAutoSend
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{typeDef.label}</span>
                      {isCustomized && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                          Personalizado
                        </Badge>
                      )}
                      {!isCustomized && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{typeDef.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {typeDef.trigger}
                      </span>
                      {sendCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {sendCount} enviados
                        </span>
                      )}
                      {lastSent && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Último: {new Date(lastSent).toLocaleDateString("pt-PT")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={isAutoSend}
                        onCheckedChange={(checked) =>
                          handleToggleAutoSend(typeDef.type, checked)
                        }
                      />
                      <span className="text-[9px] text-muted-foreground">Auto</span>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleSendTest(typeDef.type)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Teste
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setEditingType(typeDef.type)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
