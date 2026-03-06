

# Command Center: AI Control Surface Operacional

## Diagnóstico

O sistema **já tem** uma base sólida:
- **Intent detection** funciona (keyword → LLM fallback) com 15+ intents
- **Data execution** real para cada intent (queries a `opportunities`, `deal_intelligence_cache`, `revenue_forecasts`, `pipeline_stages`, etc.)
- **Quick actions** executáveis (bulk_task, bulk_move_stage, navigate, create_saved_view, automation)
- **Conversation context** com `conversationContextRef`
- **Kernel events** emitidos em cada interação
- **Widget cards** a ler de `kernel_decisions`, `change_events`, `drift_scores`, `tasks`, `calendar_events`

Os problemas reais são:
1. **Intents em falta**: `get_daily_priorities`, `get_kernel_decisions`, `get_kernel_live_feed`, `get_drift_overview`, `get_lead_drop_analysis` não existem no edge function
2. **PipelineRiskCard** filtra por `type === "pipeline_risk"` mas as decisões do Kernel podem não ter esse tipo — fonte inconsistente com o chat
3. **Respostas fallback genéricas** quando o LLM não classifica bem — não dizem explicitamente "dados insuficientes"
4. **Falta telemetria de diagnóstico** (tempo de execução, source tables, fallback vs dados reais)
5. **Quick actions no chat** não são renderizados — o `CommandOutput` com actions só aparece no modo legacy (sem chat)

## Plano de Implementação (3 Fases)

### Fase 1: Novos Intents + Dados Reais no Edge Function

**Ficheiro:** `supabase/functions/ask-fastcrm/index.ts`

Adicionar 5 novos intents ao `executeIntent` switch:

| Intent | Query Real |
|--------|-----------|
| `daily_priorities` | Combina: deals sem atividade >5d + leads sem resposta >3d + kernel_decisions open + drift score <50 |
| `kernel_decisions` | `kernel_decisions` WHERE status='open' ORDER BY created_at DESC |
| `kernel_live_feed` | `kernel_events` últimos 20 eventos |
| `drift_overview` | `context_drift` com scores + `drift_scores` workspace |
| `lead_drop_analysis` | Compara count de leads criados últimos 7d vs 7d anteriores |

Adicionar keywords e exact phrases correspondentes:
- "o que devo fazer hoje" / "prioridades" → `daily_priorities`
- "decisões pendentes" / "kernel decisions" → `kernel_decisions`
- "atividade recente" / "live feed" → `kernel_live_feed`
- "drift" / "contexto desatualizado" → `drift_overview`
- "porque caíram os leads" / "queda de leads" → `lead_drop_analysis`

Adicionar ao LLM tool enum os novos intents.

### Fase 2: Quick Actions no Chat + Fallbacks Explícitos

**Ficheiro:** `src/components/command-center/AIQuestionBox.tsx`

- Quando `result` chega com `actions` não vazias, renderizar botões clicáveis no chat thread (atualmente os actions são ignorados no modo chat)
- Cada action button chama `executeAction` do hook existente
- Incluir `result.items` como lista resumida clicável (link para entidade)

**Ficheiro:** `supabase/functions/ask-fastcrm/index.ts`

- No fallback (`default` case do `executeIntent`), em vez de "Não consegui compreender", verificar se existem dados parciais e responder com: "Não tenho dados suficientes para essa análise. [motivo específico]. Sugestão: [próximo passo]."
- Cada handler que retorna 0 items deve incluir diagnóstico: ex. "82% das oportunidades não têm próximo passo definido"

### Fase 3: Consistência dos Widgets + Telemetria

**Ficheiro:** `src/components/command-center/PipelineRiskCard.tsx`

- Em vez de filtrar `kernel_decisions` por `type === "pipeline_risk"` (que pode não existir), usar query directa a `deal_intelligence_cache` com `health_label = AT_RISK` — mesma fonte que o chat usa para `deals_at_risk`

**Ficheiro:** `supabase/functions/ask-fastcrm/index.ts`

- Adicionar campos de telemetria ao `kernel_events` insert: `execution_time_ms`, `source_tables`, `is_fallback`
- Medir tempo com `performance.now()` antes/depois do `executeIntent`

**Ficheiro:** `src/components/command-center/CommandCenterHeader.tsx`

- Garantir que `revenueToday` e `hotLeadsCount` vêm do daily brief (já acontece), mas adicionar fallback a query directa se o brief não existir

## Resumo de Ficheiros Afectados

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/ask-fastcrm/index.ts` | +5 intents, keywords, handlers, fallbacks explícitos, telemetria |
| `src/components/command-center/AIQuestionBox.tsx` | Render de quick actions e items no chat thread |
| `src/components/command-center/PipelineRiskCard.tsx` | Mudar fonte de dados para `deal_intelligence_cache` |
| `src/lib/actionRegistry.ts` | Adicionar actions para novos intents (navigate + execute) |
| `src/lib/conversationalIntent.ts` | Adicionar "prioridades do dia" como intent conversacional com stats |

## Fora de Âmbito (futuro)

- Painel de debug interno visual (requer nova página)
- `send_followup_draft` / `trigger_workflow` como quick actions (dependem de módulos ainda não integrados)
- Realtime subscription nos widgets (actualmente usam polling)

