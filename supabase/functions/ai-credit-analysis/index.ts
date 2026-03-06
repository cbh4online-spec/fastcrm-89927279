const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  mode: 'viability' | 'bank_matching' | 'extract_document' | 'copilot' | 'optimize';
  proposal?: unknown;
  financialProfile?: unknown;
  bankPartners?: Array<{ id: string; name: string; terms: unknown[] }>;
  document_type?: string;
  file_url?: string;
  file_name?: string;
  question?: string;
  action?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const request: AnalysisRequest = await req.json();
    const { mode, proposal, financialProfile, bankPartners, question, action } = request;

    console.log(`[VERTICAL-CREDIT] ai-credit-analysis invoked mode=${mode}`);

    let systemPrompt = '';
    let userPrompt = '';
    let tools = [];

    switch (mode) {
      case 'viability':
        systemPrompt = `És um analista de crédito especializado em Portugal. Analisa propostas de crédito e fornece:
- Score de viabilidade (0-100)
- Probabilidade de aprovação (0-100)
- Nível de risco (low/medium/high)
- Fatores positivos e negativos
- Sugestões de otimização
- Bancos recomendados

Considera: taxa de esforço máxima 35%, LTV máximo 90% para habitação, estabilidade de rendimentos.
Responde SEMPRE em português de Portugal.`;

        userPrompt = `Analisa esta proposta de crédito:

PROPOSTA:
${JSON.stringify(proposal, null, 2)}

${financialProfile ? `PERFIL FINANCEIRO:
${JSON.stringify(financialProfile, null, 2)}` : ''}

${bankPartners && bankPartners.length > 0 ? `BANCOS DISPONÍVEIS:
${bankPartners.map(b => `- ${b.name}`).join('\n')}` : ''}

Fornece uma análise completa de viabilidade.`;

        tools = [{
          type: 'function',
          function: {
            name: 'analyze_credit_viability',
            description: 'Analisa viabilidade de proposta de crédito',
            parameters: {
              type: 'object',
              properties: {
                viability_score: { type: 'number', description: 'Score 0-100' },
                approval_probability: { type: 'number', description: 'Probabilidade aprovação 0-100' },
                risk_level: { type: 'string', enum: ['low', 'medium', 'high'] },
                positive_factors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      factor: { type: 'string' },
                      impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                      description: { type: 'string' }
                    }
                  }
                },
                negative_factors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      factor: { type: 'string' },
                      impact: { type: 'string', enum: ['high', 'medium', 'low'] },
                      description: { type: 'string' }
                    }
                  }
                },
                neutral_factors: { type: 'array', items: { type: 'object' } },
                recommended_banks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      bank_id: { type: 'string' },
                      bank_name: { type: 'string' },
                      match_score: { type: 'number' },
                      approval_probability: { type: 'number' },
                      estimated_rate: { type: 'number' },
                      reasoning: { type: 'string' }
                    }
                  }
                },
                optimization_suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      potential_impact: { type: 'string' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                    }
                  }
                },
                document_completeness: { type: 'number' },
                missing_critical_docs: { type: 'array', items: { type: 'string' } },
                income_stability_score: { type: 'number' },
                debt_capacity_score: { type: 'number' },
                collateral_score: { type: 'number' },
                summary: { type: 'string' }
              },
              required: ['viability_score', 'approval_probability', 'risk_level', 'positive_factors', 'negative_factors', 'summary']
            }
          }
        }];
        break;

      case 'bank_matching':
        systemPrompt = `És um especialista em matching de crédito em Portugal. Compara propostas com bancos parceiros e recomenda os melhores matches.`;
        userPrompt = `Encontra os melhores bancos para esta proposta:

${JSON.stringify(proposal, null, 2)}

BANCOS:
${JSON.stringify(bankPartners, null, 2)}`;

        tools = [{
          type: 'function',
          function: {
            name: 'match_banks',
            description: 'Recomenda bancos para proposta',
            parameters: {
              type: 'object',
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      bank_id: { type: 'string' },
                      bank_name: { type: 'string' },
                      match_score: { type: 'number' },
                      approval_probability: { type: 'number' },
                      estimated_rate: { type: 'number' },
                      reasoning: { type: 'string' }
                    }
                  }
                }
              },
              required: ['recommendations']
            }
          }
        }];
        break;

      case 'copilot':
        systemPrompt = `És um assistente especializado em intermediação de crédito em Portugal. Ajudas a otimizar propostas, responder a dúvidas e sugerir próximos passos. Responde sempre em português de Portugal, de forma clara e prática.`;
        userPrompt = `Proposta atual:
${JSON.stringify(proposal, null, 2)}

${financialProfile ? `Perfil financeiro:
${JSON.stringify(financialProfile, null, 2)}` : ''}

Pergunta/Ação: ${question || action || 'O que posso fazer para melhorar esta proposta?'}`;

        tools = [{
          type: 'function',
          function: {
            name: 'copilot_response',
            description: 'Resposta do copilot',
            parameters: {
              type: 'object',
              properties: {
                response: { type: 'string', description: 'Resposta principal' },
                suggestions: { type: 'array', items: { type: 'string' } },
                actions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                    }
                  }
                }
              },
              required: ['response']
            }
          }
        }];
        break;

      case 'optimize':
        systemPrompt = `És um consultor de crédito em Portugal. Sugere formas de otimizar propostas para aumentar probabilidade de aprovação.`;
        userPrompt = `Otimiza esta proposta:
${JSON.stringify(proposal, null, 2)}`;

        tools = [{
          type: 'function',
          function: {
            name: 'optimize_proposal',
            description: 'Sugestões de otimização',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' },
                      potential_impact: { type: 'string' },
                      priority: { type: 'string', enum: ['high', 'medium', 'low'] }
                    }
                  }
                }
              },
              required: ['suggestions']
            }
          }
        }];
        break;

      default:
        console.error(`[VERTICAL-CREDIT] Unsupported mode: ${mode}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Modo não suportado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: tools[0].function.name } },
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error(`[VERTICAL-CREDIT] Rate limited mode=${mode}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de pedidos excedido. Aguarde alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error(`[VERTICAL-CREDIT] Credits exhausted mode=${mode}`);
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos IA esgotados.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error(`[VERTICAL-CREDIT] AI API error status=${response.status} mode=${mode}`);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error(`[VERTICAL-CREDIT] Invalid AI response mode=${mode} — no tool call`);
      throw new Error('Resposta inválida da IA');
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`[VERTICAL-CREDIT] ai-credit-analysis success mode=${mode}`);

    // Return based on mode
    switch (mode) {
      case 'viability':
        return new Response(
          JSON.stringify({ 
            success: true, 
            analysis: {
              ...result,
              proposal_id: (proposal as any)?.id,
              analyzed_at: new Date().toISOString(),
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'bank_matching':
        return new Response(
          JSON.stringify({ success: true, recommendations: result.recommendations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'copilot':
        return new Response(
          JSON.stringify({ success: true, response: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'optimize':
        return new Response(
          JSON.stringify({ success: true, suggestions: result.suggestions }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[VERTICAL-CREDIT] ai-credit-analysis error: ${errorMessage}`);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});