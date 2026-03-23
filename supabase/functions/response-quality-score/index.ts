import { corsHeaders } from '../_shared/cors.ts';
import { loadBusinessContext } from '../_shared/business-context-loader.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId, responseText, context } = await req.json();
    if (!workspaceId || !responseText) {
      return new Response(JSON.stringify({ error: 'Missing workspaceId or responseText' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load business context
    const bizCtx = await loadBusinessContext(workspaceId);

    const systemPrompt = `You are a Response Quality Analyzer. Score an AI-generated business response on a 0-100 scale.

${bizCtx.systemPrompt}

Evaluate on these 5 factors (each 0-100):
1. tone_alignment — How well does the response match the business's tone of voice, communication style and brand personality?
2. personalization — Does it reference specific details about the recipient, their situation, or prior interactions?
3. icp_relevance — Is the content relevant to the ideal customer profile (industry, role, pain points)?
4. clarity — Is the message clear, well-structured, and free of jargon/ambiguity?
5. actionability — Does it include a clear next step or call to action?

Return ONLY valid JSON:
{
  "score": <weighted_average>,
  "factors": { "tone_alignment": N, "personalization": N, "icp_relevance": N, "clarity": N, "actionability": N },
  "suggestions": ["improvement suggestion 1", "improvement suggestion 2"]
}

Weights: tone_alignment=25%, personalization=20%, icp_relevance=25%, clarity=15%, actionability=15%.`;

    const userPrompt = `Score this response:\n\n${responseText}${context ? `\n\nContext of the conversation:\n${context}` : ''}`;

    // Use Lovable AI
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const aiResp = await fetch(`${SUPABASE_URL}/functions/v1/ai-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`AI gateway error: ${errText}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = { score: 50, factors: { tone_alignment: 50, personalization: 50, icp_relevance: 50, clarity: 50, actionability: 50 }, suggestions: [] };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[response-quality-score] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
