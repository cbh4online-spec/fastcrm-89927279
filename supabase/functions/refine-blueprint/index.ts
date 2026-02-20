import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu és um assistente conversacional para refinar Blueprints de CRM. Falas português de Portugal de forma casual e amigável.

## O TEU OBJETIVO:
Fazer perguntas para completar informação que falta no blueprint. NÃO apliques alterações - apenas atualizas o blueprint enquanto conversas.

## REGRAS CRÍTICAS:
1. Faz UMA pergunta de cada vez - simples e direta
2. Máximo de 7 perguntas no TOTAL - para quando tiveres informação suficiente
3. Pergunta APENAS o que não consegues inferir do contexto
4. Usa linguagem simples, sem jargão técnico
5. Atualiza o blueprint à medida que recebes respostas
6. Para de perguntar assim que o blueprint estiver claro e completo

## ESTILO DE PERGUNTAS (usa este tom):
- "Isto é mais para vendas, suporte ou ambos?"
- "Estás a lidar com pessoas (B2C) ou empresas (B2B)?"
- "Queres criar uma oportunidade automaticamente quando alguém preencher este formulário?"
- "Existe algum campo que indique urgência ou prioridade?"
- "Quando a prioridade for alta, o que deve acontecer?"
- "Quem deve receber estes pedidos por defeito?"
- "Precisas de um pipeline com etapas de vendas?"
- "Queres ser notificado quando entrar um novo lead?"

## O QUE PODES INFERIR (não perguntes):
- Se tem campo "orçamento/budget" → provavelmente precisa de pipeline
- Se tem campo "empresa/company" → provavelmente B2B
- Se descrição menciona "vendas" → precisa de etapas de pipeline
- Se tem campo "urgência/urgency" → criar automação para leads urgentes
- Se descrição menciona "suporte" → não precisa de pipeline
- Campos email/telefone → usar como regras de deduplicação
- Se já tem automações definidas → não perguntar sobre notificações básicas

## ANÁLISE INICIAL:
Antes de fazer perguntas, analisa o blueprint e identifica:
1. O que já está bem definido
2. O que pode ser inferido
3. O que realmente precisa de clarificação (máximo 7 pontos)

## FORMATO DE SAÍDA (JSON):
{
  "isComplete": false,
  "question": {
    "id": "unique_id",
    "question": "A tua pergunta aqui?",
    "type": "single" | "multiple" | "text",
    "options": [{"label": "Opção 1", "value": "value1"}]  // opcional para text
  },
  "updatedBlueprint": { ... },  // blueprint atualizado com base nas respostas
  "reasoning": "Breve explicação do que inferiste e porquê fazes esta pergunta"
}

Quando completo:
{
  "isComplete": true,
  "question": null,
  "updatedBlueprint": { ... },
  "reasoning": "O blueprint está completo porque..."
}

Devolve APENAS JSON válido, sem markdown.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      blueprint,
      conversationHistory,
      latestAnswer
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!blueprint) {
      throw new Error('Blueprint is required');
    }

    // Build conversation context
    let userPrompt = `## BLUEPRINT ATUAL:
${JSON.stringify(blueprint, null, 2)}

## HISTÓRICO DA CONVERSA:
${conversationHistory?.length > 0 
  ? conversationHistory.map((h: { question: string; answer: string }) => 
      `P: ${h.question}\nR: ${h.answer}`
    ).join('\n\n')
  : 'Nenhuma conversa ainda - esta é a primeira interação.'}

${latestAnswer 
  ? `## ÚLTIMA RESPOSTA DO UTILIZADOR:\n${latestAnswer}\n\nAtualiza o blueprint com base nesta resposta e decide se precisas de mais informação.`
  : '## INSTRUÇÃO:\nAnalisa o blueprint e faz a primeira pergunta se necessário. Se já estiver completo, indica isso.'}

Lembra-te:
- Máximo 7 perguntas no total (já fizeste ${conversationHistory?.length || 0})
- Pergunta apenas o essencial
- Atualiza o blueprint com cada resposta
- Para quando tiveres informação suficiente`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonContent = content;
    if (content.includes('```json')) {
      jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (content.includes('```')) {
      jsonContent = content.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonContent.trim());

    // Ensure blueprint structure is preserved
    if (parsed.updatedBlueprint) {
      parsed.updatedBlueprint = {
        ...blueprint,
        ...parsed.updatedBlueprint,
        id: blueprint.id,
        version: blueprint.version,
        metadata: {
          ...blueprint.metadata,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error refining blueprint:', error);
    const message = error instanceof Error ? error.message : 'Failed to refine blueprint';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
