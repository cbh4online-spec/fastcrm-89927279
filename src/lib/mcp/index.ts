import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWorkspaces from "./tools/list-workspaces";
import searchContacts from "./tools/search-contacts";
import searchCompanies from "./tools/search-companies";
import listLeads from "./tools/list-leads";
import createLead from "./tools/create-lead";
import listOpportunities from "./tools/list-opportunities";
import listInvoices from "./tools/list-invoices";
import createTask from "./tools/create-task";
import sendWhatsAppText from "./tools/send-whatsapp-text";
import sendWhatsAppImage from "./tools/send-whatsapp-image";
import sendWhatsAppVideo from "./tools/send-whatsapp-video";
import getWhatsAppConversation from "./tools/get-whatsapp-conversation";
import scheduleWhatsAppMessage from "./tools/schedule-whatsapp-message";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fastcrm-mcp",
  title: "FastCRM",
  version: "0.1.0",
  instructions:
    "Ferramentas do FastCRM. Comece sempre por `list_workspaces` para obter o `workspace_id` do utilizador; todas as outras ferramentas exigem esse ID. Pode procurar contactos e empresas, listar leads, oportunidades e faturas, criar leads e tarefas, e usar o WhatsApp Pro (enviar texto/imagem/vídeo, ler conversas e agendar mensagens). Envios de marketing exigem consentimento explícito; opt-outs bloqueiam sempre o envio. Os dados devolvidos respeitam as permissões do utilizador autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listWorkspaces,
    searchContacts,
    searchCompanies,
    listLeads,
    listOpportunities,
    listInvoices,
    createLead,
    createTask,
    sendWhatsAppText,
    sendWhatsAppImage,
    sendWhatsAppVideo,
    getWhatsAppConversation,
    scheduleWhatsAppMessage,
  ],
});
