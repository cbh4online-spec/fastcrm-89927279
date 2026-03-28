import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface B2BEmailTemplateType {
  type: string;
  label: string;
  description: string;
  trigger: string;
  variables: { key: string; label: string }[];
  defaultSubject: string;
  defaultBody: string;
}

export const B2B_TEMPLATE_TYPES: B2BEmailTemplateType[] = [
  {
    type: "client_invitation",
    label: "Convite de Cliente",
    description: "Enviado quando convida um novo cliente para o portal",
    trigger: "Manual — ao convidar cliente",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{portal_url}}", label: "URL do Portal" },
      { key: "{{company_name}}", label: "Nome da Empresa" },
    ],
    defaultSubject: "Bem-vindo ao Portal B2B — {{company_name}}",
    defaultBody: "Olá {{client_name}},\n\nFoi convidado para aceder ao nosso portal de encomendas profissionais.\n\nAceda em: {{portal_url}}\n\nCumprimentos,\n{{company_name}}",
  },
  {
    type: "order_confirmation",
    label: "Confirmação de Encomenda",
    description: "Enviado ao cliente quando submete uma encomenda",
    trigger: "Automático — ao submeter encomenda",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{order_number}}", label: "Nº da Encomenda" },
      { key: "{{total}}", label: "Total" },
      { key: "{{items_count}}", label: "Nº de Produtos" },
    ],
    defaultSubject: "Encomenda #{{order_number}} recebida",
    defaultBody: "Olá {{client_name}},\n\nA sua encomenda #{{order_number}} foi recebida com sucesso.\n\nTotal: €{{total}}\nProdutos: {{items_count}}\n\nEntraremos em contacto em breve com mais informações.\n\nObrigado pela sua confiança!",
  },
  {
    type: "order_approved",
    label: "Encomenda Aprovada",
    description: "Enviado quando a encomenda é aprovada",
    trigger: "Automático — ao aprovar encomenda",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{order_number}}", label: "Nº da Encomenda" },
      { key: "{{estimated_delivery}}", label: "Data Estimada" },
    ],
    defaultSubject: "Encomenda #{{order_number}} aprovada ✅",
    defaultBody: "Olá {{client_name}},\n\nA sua encomenda #{{order_number}} foi aprovada e está a ser processada.\n\nData estimada de entrega: {{estimated_delivery}}\n\nObrigado!",
  },
  {
    type: "order_rejected",
    label: "Encomenda Rejeitada",
    description: "Enviado quando a encomenda é rejeitada",
    trigger: "Automático — ao rejeitar encomenda",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{order_number}}", label: "Nº da Encomenda" },
      { key: "{{rejection_reason}}", label: "Motivo da Rejeição" },
    ],
    defaultSubject: "Encomenda #{{order_number}} não aprovada",
    defaultBody: "Olá {{client_name}},\n\nLamentamos informar que a sua encomenda #{{order_number}} não foi aprovada.\n\nMotivo: {{rejection_reason}}\n\nPor favor entre em contacto para mais informações.",
  },
  {
    type: "order_shipped",
    label: "Encomenda Expedida",
    description: "Enviado quando a encomenda é expedida",
    trigger: "Automático — ao marcar como expedida",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{order_number}}", label: "Nº da Encomenda" },
      { key: "{{tracking_url}}", label: "URL de Tracking" },
    ],
    defaultSubject: "Encomenda #{{order_number}} expedida 🚚",
    defaultBody: "Olá {{client_name}},\n\nA sua encomenda #{{order_number}} foi expedida!\n\nAcompanhe a entrega: {{tracking_url}}\n\nObrigado!",
  },
  {
    type: "order_delivered",
    label: "Encomenda Entregue",
    description: "Enviado quando a encomenda é entregue",
    trigger: "Automático — ao marcar como entregue",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{order_number}}", label: "Nº da Encomenda" },
    ],
    defaultSubject: "Encomenda #{{order_number}} entregue ✅",
    defaultBody: "Olá {{client_name}},\n\nA sua encomenda #{{order_number}} foi entregue com sucesso.\n\nObrigado pela sua preferência!",
  },
  {
    type: "payment_reminder",
    label: "Lembrete de Pagamento",
    description: "Enviado antes do vencimento do pagamento",
    trigger: "Automático — 3 dias antes do vencimento",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{invoice_number}}", label: "Nº da Fatura" },
      { key: "{{amount}}", label: "Valor" },
      { key: "{{due_date}}", label: "Data de Vencimento" },
    ],
    defaultSubject: "Lembrete: Pagamento de €{{amount}} vence a {{due_date}}",
    defaultBody: "Olá {{client_name}},\n\nEste é um lembrete amigável de que a fatura #{{invoice_number}} no valor de €{{amount}} vence a {{due_date}}.\n\nAgradecemos o pagamento atempado.",
  },
  {
    type: "welcome_client",
    label: "Boas-vindas",
    description: "Enviado no primeiro login do cliente",
    trigger: "Automático — primeiro login",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{company_name}}", label: "Nome da Empresa" },
      { key: "{{portal_url}}", label: "URL do Portal" },
    ],
    defaultSubject: "Bem-vindo ao portal {{company_name}}!",
    defaultBody: "Olá {{client_name}},\n\nBem-vindo ao nosso portal de encomendas!\n\nAqui pode:\n• Consultar o catálogo completo\n• Fazer encomendas online\n• Acompanhar o estado das suas encomendas\n\nAceda em: {{portal_url}}\n\nBom trabalho!",
  },
  {
    type: "reorder_reminder",
    label: "Lembrete de Re-encomenda",
    description: "Enviado quando o cliente não faz encomendas há 30 dias",
    trigger: "Automático — 30 dias sem encomenda",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{last_order_date}}", label: "Última Encomenda" },
      { key: "{{top_products}}", label: "Produtos Frequentes" },
    ],
    defaultSubject: "Precisamos de si! Faça a sua próxima encomenda",
    defaultBody: "Olá {{client_name}},\n\nReparámos que a sua última encomenda foi a {{last_order_date}}.\n\nOs seus produtos habituais:\n{{top_products}}\n\nVisite o portal para fazer uma nova encomenda!",
  },
  {
    type: "account_summary",
    label: "Resumo Mensal",
    description: "Resumo mensal de atividade da conta",
    trigger: "Automático — mensal",
    variables: [
      { key: "{{client_name}}", label: "Nome do Cliente" },
      { key: "{{month}}", label: "Mês" },
      { key: "{{orders_count}}", label: "Nº de Encomendas" },
      { key: "{{total_spent}}", label: "Total Gasto" },
    ],
    defaultSubject: "Resumo do mês de {{month}}",
    defaultBody: "Olá {{client_name}},\n\nAqui está o resumo da sua conta no mês de {{month}}:\n\nEncomendas: {{orders_count}}\nTotal: €{{total_spent}}\n\nObrigado pela sua parceria!",
  },
];

export function useB2BEmailTemplates(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["b2b-email-templates", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("workspace_email_templates")
        .select("*")
        .eq("workspace_id", workspaceId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!workspaceId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (template: {
      id?: string;
      workspace_id: string;
      template_type: string;
      subject_template: string;
      body_template: string;
      is_auto_send: boolean;
      variables_schema: { key: string; label: string }[];
    }) => {
      if (template.id) {
        const { error } = await supabase
          .from("workspace_email_templates")
          .update({
            subject_template: template.subject_template,
            body_template: template.body_template,
            is_auto_send: template.is_auto_send,
            variables_schema: template.variables_schema as any,
          })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workspace_email_templates")
          .insert({
            workspace_id: template.workspace_id,
            template_type: template.template_type,
            subject_template: template.subject_template,
            body_template: template.body_template,
            is_auto_send: template.is_auto_send,
            variables_schema: template.variables_schema as any,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-email-templates", workspaceId] });
      toast.success("Template guardado com sucesso");
    },
    onError: (err: Error) => {
      toast.error("Erro ao guardar template: " + err.message);
    },
  });

  const toggleAutoSend = useMutation({
    mutationFn: async ({ id, is_auto_send }: { id: string; is_auto_send: boolean }) => {
      const { error } = await supabase
        .from("workspace_email_templates")
        .update({ is_auto_send })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-email-templates", workspaceId] });
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    upsertTemplate: upsertMutation.mutateAsync,
    toggleAutoSend: toggleAutoSend.mutateAsync,
    isSaving: upsertMutation.isPending,
  };
}
