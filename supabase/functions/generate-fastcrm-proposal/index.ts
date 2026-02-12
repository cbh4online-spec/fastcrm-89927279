import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WORKSPACE_ID = "d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f";
const OWNER_ID = "444ba746-3e86-4283-a363-ad2b27b81dc9";
const STAGE_PROPOSTA_APRESENTADA = "b9a097c9-b2f5-477d-beb6-f29aa70e2a5b";

interface QualificationData {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  sector?: string;
  users_count: number;
  contacts_count: number;
  workspaces_count: number;
  needs_whatsapp: boolean;
  needs_instagram: boolean;
  needs_ecommerce: boolean;
  needs_client_portal: boolean;
  needs_knowledge_base: boolean;
  needs_ai_sales_coach: boolean;
  needs_api: boolean;
  integrations_required?: string;
  ai_usage_level: "low" | "medium" | "high";
}

function determinePlan(data: QualificationData): string {
  const advancedFeatures = data.needs_knowledge_base || data.needs_ai_sales_coach || data.needs_api;
  
  if (
    data.users_count <= 1 &&
    data.contacts_count <= 100 &&
    data.workspaces_count === 1 &&
    !advancedFeatures &&
    !data.needs_whatsapp &&
    !data.needs_instagram &&
    !data.needs_ecommerce &&
    !data.needs_client_portal
  ) {
    return "free";
  }
  
  if (
    data.users_count <= 10 &&
    data.contacts_count <= 5000 &&
    data.workspaces_count === 1 &&
    !advancedFeatures
  ) {
    return "business";
  }
  
  if (
    data.users_count <= 25 ||
    data.contacts_count <= 25000 ||
    data.workspaces_count <= 5 ||
    data.needs_knowledge_base ||
    data.needs_ai_sales_coach ||
    data.needs_api
  ) {
    return "professional";
  }
  
  return "enterprise";
}

function calculatePricing(data: QualificationData, plan: string) {
  const basePrices: Record<string, number> = {
    free: 0,
    business: 129,
    professional: 299,
    enterprise: 799,
  };

  let planBase = basePrices[plan] || 0;
  let addons = 0;
  let usersAdj = 0;
  let contactsAdj = 0;
  let workspacesAdj = 0;
  let aiPackPrice = 0;
  let aiPackLabel: string | null = null;

  // Add-ons (only for paid plans)
  if (plan !== "free") {
    if (data.needs_whatsapp) addons += 39;
    if (data.needs_instagram) addons += 29;
    if (data.needs_ecommerce) addons += 59;
    if (data.needs_client_portal) addons += 39;
    if (data.needs_knowledge_base) addons += 99;
    if (data.needs_ai_sales_coach) addons += 79;
    if (data.needs_api) addons += 59;
  }

  // Users adjustment
  if (plan === "business" && data.users_count > 10) {
    usersAdj = 9 * (data.users_count - 10);
  } else if (plan === "professional" && data.users_count > 25) {
    usersAdj = 7 * (data.users_count - 25);
  }

  // Contacts adjustment
  if (plan === "business" && data.contacts_count > 5000) {
    contactsAdj = Math.ceil((data.contacts_count - 5000) / 5000) * 25;
  } else if (plan === "professional" && data.contacts_count > 25000) {
    contactsAdj = Math.ceil((data.contacts_count - 25000) / 25000) * 50;
  }

  // Workspaces adjustment
  if (plan === "professional" && data.workspaces_count > 5) {
    workspacesAdj = 79 * (data.workspaces_count - 5);
  }

  // AI packs
  if (data.ai_usage_level === "medium") {
    aiPackPrice = 29;
    aiPackLabel = "+5.000 AI credits";
  } else if (data.ai_usage_level === "high") {
    aiPackPrice = 79;
    aiPackLabel = "+20.000 AI credits";
  }

  // Setup fee
  let setupFee = 0;
  let setupFeeLabel: string | null = null;
  if (plan === "business") {
    setupFee = 490;
    setupFeeLabel = "490€";
  } else if (plan === "professional") {
    setupFee = 990;
    setupFeeLabel = "990€";
  } else if (plan === "enterprise") {
    setupFee = 0;
    setupFeeLabel = "Sob validação técnica";
  }

  const monthlyTotal = planBase + addons + usersAdj + contactsAdj + workspacesAdj + aiPackPrice;

  return {
    planBase,
    addons,
    usersAdj,
    contactsAdj,
    workspacesAdj,
    aiPackPrice,
    aiPackLabel,
    monthlyTotal,
    setupFee,
    setupFeeLabel,
  };
}

function generateProposalHtml(data: QualificationData, plan: string, pricing: ReturnType<typeof calculatePricing>, validUntil: string): string {
  const planNames: Record<string, string> = {
    free: "Free",
    business: "Business",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  const modules: string[] = [];
  modules.push("CRM Core", "Dashboard", "Pipeline");
  if (data.needs_whatsapp) modules.push("WhatsApp Business API");
  if (data.needs_instagram) modules.push("Instagram Integration");
  if (data.needs_ecommerce) modules.push("Loja Online");
  if (data.needs_client_portal) modules.push("Portal Cliente");
  if (data.needs_knowledge_base) modules.push("Knowledge Base com IA");
  if (data.needs_ai_sales_coach) modules.push("AI Sales Coach");
  if (data.needs_api) modules.push("API Access");
  if (plan === "professional" || plan === "enterprise") {
    modules.push("Automações Avançadas", "Relatórios Operacionais");
  }
  if (plan === "enterprise") {
    modules.push("White-label", "SLA Prioritário", "Edge Functions Dedicadas");
  }

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Proposta Estratégica FastCRM - ${data.company_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0e1a; color: #e2e8f0; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 32px; }
    .header { text-align: center; padding: 48px 0 32px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 40px; }
    .header h1 { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .header p { color: #94a3b8; font-size: 14px; }
    .badge { display: inline-block; background: #3b82f6; color: #fff; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    .section { margin-bottom: 36px; }
    .section h2 { font-size: 18px; font-weight: 600; color: #3b82f6; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(59,130,246,0.2); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px 16px; font-size: 14px; }
    .grid-item .label { color: #94a3b8; font-size: 12px; }
    .grid-item .value { color: #fff; font-weight: 500; }
    .modules-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .module-tag { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); color: #93c5fd; padding: 6px 14px; border-radius: 6px; font-size: 13px; }
    .pricing-box { background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.15); border-radius: 12px; padding: 28px; }
    .pricing-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .pricing-row.total { border-top: 1px solid rgba(255,255,255,0.1); margin-top: 12px; padding-top: 16px; font-size: 18px; font-weight: 700; color: #fff; }
    .pricing-row .amount { color: #fff; font-weight: 500; }
    .steps { counter-reset: step; }
    .step { counter-increment: step; padding: 12px 0; padding-left: 36px; position: relative; font-size: 14px; }
    .step::before { content: counter(step); position: absolute; left: 0; top: 12px; width: 24px; height: 24px; border-radius: 50%; background: rgba(59,130,246,0.15); color: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
    .validity { text-align: center; padding: 20px; color: #94a3b8; font-size: 13px; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.06); }
    .footer { text-align: center; padding: 32px 0; color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Proposta Estratégica</div>
      <h1>FastCRM</h1>
      <p>Infraestrutura Digital Empresarial com IA</p>
    </div>

    <div class="section">
      <h2>1. Diagnóstico</h2>
      <div class="grid">
        <div class="grid-item"><div class="label">Empresa</div><div class="value">${data.company_name}</div></div>
        <div class="grid-item"><div class="label">Contacto</div><div class="value">${data.contact_name}</div></div>
        <div class="grid-item"><div class="label">Sector</div><div class="value">${data.sector || "Não especificado"}</div></div>
        <div class="grid-item"><div class="label">Email</div><div class="value">${data.email}</div></div>
        <div class="grid-item"><div class="label">Utilizadores</div><div class="value">${data.users_count}</div></div>
        <div class="grid-item"><div class="label">Contactos</div><div class="value">${data.contacts_count.toLocaleString()}</div></div>
        <div class="grid-item"><div class="label">Workspaces</div><div class="value">${data.workspaces_count}</div></div>
        <div class="grid-item"><div class="label">Nível IA</div><div class="value">${data.ai_usage_level === "low" ? "Básico" : data.ai_usage_level === "medium" ? "Intermédio" : "Avançado"}</div></div>
      </div>
    </div>

    <div class="section">
      <h2>2. Plano Recomendado</h2>
      <p style="font-size: 24px; font-weight: 700; color: #fff;">${planNames[plan]}</p>
    </div>

    <div class="section">
      <h2>3. Âmbito Incluído</h2>
      <div class="modules-list">
        ${modules.map(m => `<span class="module-tag">${m}</span>`).join("")}
      </div>
    </div>

    <div class="section">
      <h2>4. Investimento</h2>
      <div class="pricing-box">
        <div class="pricing-row"><span>Plano base (${planNames[plan]})</span><span class="amount">${pricing.planBase}€</span></div>
        ${pricing.addons > 0 ? `<div class="pricing-row"><span>Add-ons</span><span class="amount">+${pricing.addons}€</span></div>` : ""}
        ${pricing.usersAdj > 0 ? `<div class="pricing-row"><span>Ajuste utilizadores</span><span class="amount">+${pricing.usersAdj}€</span></div>` : ""}
        ${pricing.contactsAdj > 0 ? `<div class="pricing-row"><span>Ajuste contactos</span><span class="amount">+${pricing.contactsAdj}€</span></div>` : ""}
        ${pricing.workspacesAdj > 0 ? `<div class="pricing-row"><span>Ajuste workspaces</span><span class="amount">+${pricing.workspacesAdj}€</span></div>` : ""}
        ${pricing.aiPackPrice > 0 ? `<div class="pricing-row"><span>AI Pack (${pricing.aiPackLabel})</span><span class="amount">+${pricing.aiPackPrice}€</span></div>` : ""}
        <div class="pricing-row total"><span>Mensalidade estimada</span><span>${pricing.monthlyTotal}€/mês</span></div>
        <div class="pricing-row" style="margin-top: 12px;"><span>Setup</span><span class="amount">${pricing.setupFeeLabel || "0€"}</span></div>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 12px;">Valor poderá ajustar após validação técnica final.</p>
    </div>

    <div class="section">
      <h2>5. Próximos Passos</h2>
      <div class="steps">
        <div class="step">Reunião de alinhamento</div>
        <div class="step">Confirmação de escopo</div>
        <div class="step">Kickoff</div>
      </div>
    </div>

    <div class="validity">
      Proposta válida até ${validUntil}
    </div>
    
    <div class="footer">
      FastCRM — Infraestrutura Digital Empresarial com IA<br/>
      fastcrm.metodopare.ai
    </div>
  </div>
</body>
</html>`;
}

function buildEmailHtml(data: QualificationData, plan: string, monthlyTotal: number, proposalUrl: string): string {
  const planNames: Record<string, string> = { free: "Free", business: "Business", professional: "Professional", enterprise: "Enterprise" };
  
  return `<!DOCTYPE html>
<html lang="pt" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Proposta FastCRM</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background-color: #0a0e1a; border-radius: 12px 12px 0 0; padding: 32px 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 22px; font-weight: bold; margin: 0;">FastCRM</h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 8px 0 0 0;">Infraestrutura Digital Empresarial</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <h2 style="color: #1f2937; font-size: 18px; margin: 0 0 16px 0;">Ola ${data.contact_name},</h2>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                Com base nas informacoes partilhadas, preparamos uma proposta estrategica ajustada a sua operacao.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f8fafc; border-radius: 8px; padding: 20px;">
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 4px 0;">Plano recomendado</p>
                    <p style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 12px 0;">${planNames[plan]}</p>
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 4px 0;">Investimento estimado</p>
                    <p style="color: #3b82f6; font-size: 24px; font-weight: bold; margin: 0;">${monthlyTotal}€/mes</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #3b82f6; border-radius: 8px;">
                    <a href="${proposalUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold;">Consultar Proposta Completa</a>
                  </td>
                </tr>
              </table>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                Estamos disponiveis para alinhar os proximos passos.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-radius: 0 0 12px 12px; padding: 20px 40px; text-align: center;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">FastCRM — fastcrm.metodopare.ai</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const data: QualificationData = await req.json();

    // Validate required fields
    if (!data.company_name || !data.contact_name || !data.email) {
      return new Response(
        JSON.stringify({ error: "company_name, contact_name, and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Determine plan
    const plan = determinePlan(data);
    console.log(`[PROPOSAL] Plan determined: ${plan} for ${data.company_name}`);

    // 2. Calculate pricing
    const pricing = calculatePricing(data, plan);
    console.log(`[PROPOSAL] Monthly total: ${pricing.monthlyTotal}€`);

    // 3. Calculate valid until (7 days)
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 7);
    const validUntil = validUntilDate.toISOString();
    const validUntilFormatted = validUntilDate.toLocaleDateString("pt-PT");

    // 4. Generate proposal HTML
    const proposalHtml = generateProposalHtml(data, plan, pricing, validUntilFormatted);

    // 5. Create lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        workspace_id: WORKSPACE_ID,
        name: data.contact_name,
        email: data.email,
        phone: data.phone || null,
        company_name: data.company_name,
        source: "landing_page",
        status: "qualified",
        tags: ["Proposta FastCRM", plan],
        created_by: OWNER_ID,
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("[PROPOSAL] Lead creation error:", leadError);
    }

    // 6. Create opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .insert({
        workspace_id: WORKSPACE_ID,
        title: `Proposta FastCRM — ${data.company_name}`,
        value: pricing.monthlyTotal * 12,
        stage_id: STAGE_PROPOSTA_APRESENTADA,
        owner_id: OWNER_ID,
        status: "open",
        lead_id: lead?.id || null,
        source: "landing_page",
        currency: "EUR",
        probability: plan === "enterprise" ? 60 : plan === "professional" ? 50 : 40,
        notes: `Plano: ${plan}\nMensalidade: ${pricing.monthlyTotal}€\nSetup: ${pricing.setupFeeLabel}\nUtilizadores: ${data.users_count}\nContactos: ${data.contacts_count}\nWorkspaces: ${data.workspaces_count}`,
        billing_type: "recurring",
        mrr_amount: pricing.monthlyTotal,
        billing_frequency: "monthly",
      })
      .select("id")
      .single();

    if (oppError) {
      console.error("[PROPOSAL] Opportunity creation error:", oppError);
    }

    // 7. Store proposal in database
    const { data: proposal, error: proposalError } = await supabase
      .from("fastcrm_proposals")
      .insert({
        workspace_id: WORKSPACE_ID,
        company_name: data.company_name,
        contact_name: data.contact_name,
        email: data.email,
        phone: data.phone || null,
        sector: data.sector || null,
        users_count: data.users_count,
        contacts_count: data.contacts_count,
        workspaces_count: data.workspaces_count,
        needs_whatsapp: data.needs_whatsapp,
        needs_instagram: data.needs_instagram,
        needs_ecommerce: data.needs_ecommerce,
        needs_client_portal: data.needs_client_portal,
        needs_knowledge_base: data.needs_knowledge_base,
        needs_ai_sales_coach: data.needs_ai_sales_coach,
        needs_api: data.needs_api,
        integrations_required: data.integrations_required || null,
        ai_usage_level: data.ai_usage_level,
        recommended_plan: plan,
        plan_base_price: pricing.planBase,
        addons_total: pricing.addons,
        users_adjustment: pricing.usersAdj,
        contacts_adjustment: pricing.contactsAdj,
        workspaces_adjustment: pricing.workspacesAdj,
        ai_pack_price: pricing.aiPackPrice,
        ai_pack_label: pricing.aiPackLabel,
        monthly_total: pricing.monthlyTotal,
        setup_fee: pricing.setupFee,
        setup_fee_label: pricing.setupFeeLabel,
        opportunity_id: opportunity?.id || null,
        lead_id: lead?.id || null,
        proposal_html: proposalHtml,
        valid_until: validUntil,
        status: "sent",
      })
      .select("id")
      .single();

    if (proposalError) {
      console.error("[PROPOSAL] Proposal storage error:", proposalError);
      throw proposalError;
    }

    console.log(`[PROPOSAL] Proposal created: ${proposal.id}`);

    // 8. Send email
    let emailSentAt: string | null = null;
    const proposalUrl = `https://fastcrm.metodopare.ai/proposal/${proposal.id}`;

    if (resendApiKey) {
      try {
        const emailHtml = buildEmailHtml(data, plan, pricing.monthlyTotal, proposalUrl);
        
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "FastCRM <noreply@m.fastcrm.metodopare.ai>",
            to: [data.email],
            subject: `Proposta FastCRM — ${data.company_name}`,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          emailSentAt = new Date().toISOString();
          console.log(`[PROPOSAL] Email sent to ${data.email}`);
          
          await supabase
            .from("fastcrm_proposals")
            .update({ email_sent_at: emailSentAt })
            .eq("id", proposal.id);
        } else {
          const errBody = await emailRes.text();
          console.error("[PROPOSAL] Email send error:", errBody);
        }
      } catch (emailError) {
        console.error("[PROPOSAL] Email error (non-blocking):", emailError);
      }
    } else {
      console.warn("[PROPOSAL] RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id: proposal.id,
        recommended_plan: plan,
        monthly_total: pricing.monthlyTotal,
        setup_fee: pricing.setupFee,
        setup_fee_label: pricing.setupFeeLabel,
        opportunity_id: opportunity?.id || null,
        lead_id: lead?.id || null,
        email_sent: !!emailSentAt,
        proposal_url: proposalUrl,
        pricing,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PROPOSAL] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
