import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendRequest {
  workspaceId: string;
  templateType: string;
  recipientEmail: string;
  variables: Record<string, string>;
  isTest?: boolean;
}

// Default templates used when no custom template exists
const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  client_invitation: {
    subject: "Bem-vindo ao Portal B2B — {{company_name}}",
    body: "Olá {{client_name}},\n\nFoi convidado para aceder ao nosso portal de encomendas profissionais.\n\nAceda em: {{portal_url}}\n\nCumprimentos,\n{{company_name}}",
  },
  order_confirmation: {
    subject: "Encomenda #{{order_number}} recebida",
    body: "Olá {{client_name}},\n\nA sua encomenda #{{order_number}} foi recebida com sucesso.\n\nTotal: €{{total}}\nProdutos: {{items_count}}\n\nEntraremos em contacto em breve.\n\nObrigado!",
  },
  order_approved: {
    subject: "Encomenda #{{order_number}} aprovada ✅",
    body: "Olá {{client_name}},\n\nA sua encomenda #{{order_number}} foi aprovada e está a ser processada.\n\nData estimada de entrega: {{estimated_delivery}}\n\nObrigado!",
  },
  order_rejected: {
    subject: "Encomenda #{{order_number}} não aprovada",
    body: "Olá {{client_name}},\n\nLamentamos informar que a sua encomenda #{{order_number}} não foi aprovada.\n\nMotivo: {{rejection_reason}}\n\nPor favor entre em contacto para mais informações.",
  },
  order_shipped: {
    subject: "Encomenda #{{order_number}} expedida 🚚",
    body: "Olá {{client_name}},\n\nA sua encomenda #{{order_number}} foi expedida!\n\nAcompanhe a entrega: {{tracking_url}}\n\nObrigado!",
  },
  order_delivered: {
    subject: "Encomenda #{{order_number}} entregue ✅",
    body: "Olá {{client_name}},\n\nA sua encomenda #{{order_number}} foi entregue com sucesso.\n\nObrigado pela sua preferência!",
  },
  payment_reminder: {
    subject: "Lembrete: Pagamento de €{{amount}} vence a {{due_date}}",
    body: "Olá {{client_name}},\n\nEste é um lembrete de que a fatura #{{invoice_number}} no valor de €{{amount}} vence a {{due_date}}.\n\nAgradecemos o pagamento atempado.",
  },
  welcome_client: {
    subject: "Bem-vindo ao portal {{company_name}}!",
    body: "Olá {{client_name}},\n\nBem-vindo ao nosso portal de encomendas!\n\nAceda em: {{portal_url}}\n\nBom trabalho!",
  },
  reorder_reminder: {
    subject: "Precisamos de si! Faça a sua próxima encomenda",
    body: "Olá {{client_name}},\n\nA sua última encomenda foi a {{last_order_date}}.\n\nOs seus produtos habituais:\n{{top_products}}\n\nVisite o portal para uma nova encomenda!",
  },
  account_summary: {
    subject: "Resumo do mês de {{month}}",
    body: "Olá {{client_name}},\n\nResumo da sua conta em {{month}}:\n\nEncomendas: {{orders_count}}\nTotal: €{{total_spent}}\n\nObrigado pela sua parceria!",
  },
};

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const tag = key.startsWith("{{") ? key : `{{${key}}}`;
    result = result.split(tag).join(value || "");
  }
  return result;
}

function buildHtmlEmail(subject: string, bodyText: string, workspaceName: string, primaryColor: string): string {
  const bodyHtml = bodyText.split("\n").map(line => 
    line.trim() ? `<p style="margin: 0 0 12px 0; color: #374151; font-size: 15px; line-height: 1.6;">${line}</p>` 
    : `<br/>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f5f7;">
  <div style="max-width: 580px; margin: 0 auto;">
    <div style="background: ${primaryColor}; padding: 28px 30px; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 600;">${workspaceName}</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
      ${bodyHtml}
    </div>
    <div style="text-align: center; margin-top: 16px; color: #9ca3af; font-size: 11px;">
      <p>Email enviado automaticamente por ${workspaceName}</p>
    </div>
  </div>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { workspaceId, templateType, recipientEmail, variables, isTest }: SendRequest = await req.json();

    if (!workspaceId || !templateType || !recipientEmail) {
      throw new Error("workspaceId, templateType, and recipientEmail are required");
    }

    console.log(`[B2B-EMAIL] Sending ${templateType} to ${recipientEmail} (test=${!!isTest})`);

    // Fetch custom template
    const { data: customTemplate } = await adminClient
      .from("workspace_email_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("template_type", templateType)
      .maybeSingle();

    // Check if auto-send is disabled (unless it's a test)
    if (!isTest && customTemplate && customTemplate.is_auto_send === false) {
      console.log(`[B2B-EMAIL] Auto-send disabled for ${templateType}, skipping`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "auto_send_disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get workspace info
    const { data: workspace } = await adminClient
      .from("workspaces")
      .select("name, primary_color")
      .eq("id", workspaceId)
      .single();

    const workspaceName = workspace?.name || "Portal B2B";
    const primaryColor = workspace?.primary_color || "#3b82f6";

    // Resolve template: custom or default
    const defaults = DEFAULT_TEMPLATES[templateType];
    if (!defaults && !customTemplate) {
      throw new Error(`Unknown template type: ${templateType}`);
    }

    const subjectTemplate = customTemplate?.subject_template || defaults?.subject || "";
    const bodyTemplate = customTemplate?.body_template || defaults?.body || "";

    // Replace variables
    const finalSubject = replaceVariables(subjectTemplate, variables || {});
    const finalBody = replaceVariables(bodyTemplate, variables || {});

    // Build HTML
    const htmlEmail = buildHtmlEmail(finalSubject, finalBody, workspaceName, primaryColor);

    // Send via Resend
    const resend = new Resend(resendApiKey);
    const testPrefix = isTest ? "[TESTE] " : "";

    await resend.emails.send({
      from: `${workspaceName} <noreply@resend.dev>`,
      to: [recipientEmail],
      subject: `${testPrefix}${finalSubject}`,
      html: htmlEmail,
    });

    // Update send count (if custom template exists)
    if (customTemplate && !isTest) {
      await adminClient
        .from("workspace_email_templates")
        .update({
          send_count: (customTemplate.send_count || 0) + 1,
          last_sent_at: new Date().toISOString(),
        })
        .eq("id", customTemplate.id);
    }

    console.log(`[B2B-EMAIL] Sent ${templateType} to ${recipientEmail}`);

    return new Response(
      JSON.stringify({ success: true, recipientEmail }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[B2B-EMAIL] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
