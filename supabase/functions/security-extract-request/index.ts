import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { request_id, raw_text, workspace_id } = await req.json();
    if (!request_id || !raw_text) throw new Error("request_id and raw_text are required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Use Lovable AI (Gemini) for extraction
    const prompt = `Extrai dados estruturados da seguinte mensagem de um parceiro de segurança eletrónica.
A mensagem pode conter pedidos de certificação, instalação, manutenção ou ampliação de sistemas CCTV, intrusão ou SADI.

Devolve um JSON com estes campos (usa null se não encontrado):
{
  "client_name": "nome do cliente/condomínio/empresa",
  "client_type": "particular|empresa|condominio",
  "address": "morada completa",
  "postal_code": "código postal",
  "locality": "localidade",
  "responsible_name": "nome do responsável local",
  "responsible_address": "morada do responsável se diferente",
  "responsible_phone": "telefone",
  "responsible_email": "email",
  "request_type": "certification|installation|maintenance|expansion|regularization",
  "system_type": "cctv|intrusion|sadi|access_control|mixed",
  "installation_date": "data no formato YYYY-MM-DD",
  "zones": ["lista de zonas/câmaras/pontos"],
  "observations": "observações adicionais",
  "missing_fields": ["campos que não foram encontrados na mensagem"]
}

Mensagem:
---
${raw_text}
---

Responde APENAS com o JSON válido, sem markdown nem texto adicional.`;

    // Call AI Gateway
    const aiResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-gateway`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    let parsed: any = {};
    let confidence = 0;
    let missingFields: string[] = [];

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData?.choices?.[0]?.message?.content || aiData?.content || "";
      
      // Parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
          missingFields = parsed.missing_fields || [];
          delete parsed.missing_fields;
          
          // Calculate confidence based on filled fields
          const importantFields = ["client_name", "address", "responsible_name", "request_type", "system_type"];
          const filled = importantFields.filter((f) => parsed[f] && parsed[f] !== null);
          confidence = Math.round((filled.length / importantFields.length) * 100);
        }
      } catch {
        // If parsing fails, set low confidence
        confidence = 10;
        missingFields = ["Extração parcial - revise manualmente"];
      }
    } else {
      // AI not available - try basic regex extraction
      parsed = basicExtraction(raw_text);
      confidence = 30;
      missingFields = ["Extração automática indisponível - revise manualmente"];
    }

    // Update the request record
    const status = confidence >= 70 ? "extracted" : "needs_review";
    await supabase
      .from("security_partner_requests")
      .update({
        extraction_status: status,
        extraction_confidence: confidence,
        parsed_payload_json: parsed,
        missing_fields_json: missingFields,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request_id);

    // Log audit event
    await supabase.from("security_audit_events").insert({
      workspace_id,
      entity_type: "partner_request",
      entity_id: request_id,
      action_type: "extraction_completed",
      new_state_json: { status, confidence, fields_count: Object.keys(parsed).length },
      source: "ai",
    });

    return new Response(
      JSON.stringify({ success: true, status, confidence, parsed, missing_fields: missingFields }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function basicExtraction(text: string): Record<string, any> {
  const result: Record<string, any> = {};
  
  // Try to extract phone
  const phoneMatch = text.match(/(?:telef|tel|phone|tlm)[^\d]*(\d[\d\s]{7,})/i);
  if (phoneMatch) result.responsible_phone = phoneMatch[1].replace(/\s/g, "");

  // Try to extract name after "Nome:"
  const nameMatch = text.match(/nome\s*:\s*(.+)/i);
  if (nameMatch) result.client_name = nameMatch[1].trim();

  // Try to extract address after "Morada:"
  const addrMatch = text.match(/morada\s*:\s*(.+)/i);
  if (addrMatch) result.address = addrMatch[1].trim();

  // Detect system type
  if (/c[âa]mara|cctv|videovig/i.test(text)) result.system_type = "cctv";
  else if (/intrus/i.test(text)) result.system_type = "intrusion";
  else if (/sadi|inc[êe]ndio/i.test(text)) result.system_type = "sadi";

  // Detect request type
  if (/certifica/i.test(text)) result.request_type = "certification";
  else if (/manuten/i.test(text)) result.request_type = "maintenance";
  else if (/instala/i.test(text)) result.request_type = "installation";

  // Extract camera/zone list
  const zones: string[] = [];
  const cameraMatches = text.matchAll(/[Cc][âa]mara\s*\d*\s*[-–:]\s*(.+)/g);
  for (const m of cameraMatches) zones.push(m[1].trim());
  if (zones.length > 0) result.zones = zones;

  // Extract date
  const dateMatch = text.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (dateMatch) {
    const months: Record<string, string> = {
      janeiro: "01", fevereiro: "02", março: "03", abril: "04", maio: "05", junho: "06",
      julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
    };
    const m = months[dateMatch[2].toLowerCase()];
    if (m) result.installation_date = `${dateMatch[3]}-${m}-${dateMatch[1].padStart(2, "0")}`;
  }

  return result;
}
