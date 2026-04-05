

# Diagnóstico: Módulo AI SDR & Outbound

## Resultado: ADAPTAR, não construir do zero

O FastCRM já tem **~80% da infraestrutura necessária** dispersa por vários módulos. O trabalho é **orquestrar e unificar** — não reconstruir.

## Inventário do que já existe

| Capacidade | Módulo Existente | Estado |
|---|---|---|
| Prospecção e descoberta de perfis | `professional-prospecting-search`, FastMatch, Google Local | ✅ Completo |
| Geração de mensagens personalizadas por IA | `generate-prospecting-message` | ✅ Completo |
| Fila de outreach com steps (1ª msg, follow-up, fecho) | `prospecting_outreach_queue` + `prospecting-outreach-processor` | ✅ Completo |
| Sequências multicanal (email, WhatsApp, SMS, wait, condition) | `multichannel_sequences` + `multichannel_sequence_steps` | ✅ Completo |
| AI Employees com ações CRM (create_lead, book_meeting, handover) | `ai-employee-executor` v3 (1676 linhas) | ✅ Completo |
| Roles de agente (lead_qualifier, followup_operator, meeting_setter, pipeline_nudger) | `AGENT_ROLES` em useBots.ts | ✅ Completo |
| Controlo anti-loop para outbound | `inboxSafety.ts` (max consecutive, cooldown) | ✅ Completo |
| Enrichment de contactos | Lead Enricher, `ai-entity-insights` | ✅ Completo |
| Scoring e temperatura (cold/warm/hot) | `contact-insights`, `ai-entity-insights` | ✅ Completo |
| Background jobs scheduler | Trigger.dev (`ai-employee-scheduler`) | ✅ Completo |

## O que FALTA para ter um SDR completo

| Lacuna | Descrição |
|---|---|
| **Cadência SDR unificada** | Ligar a `prospecting_outreach_queue` às `multichannel_sequences` — hoje são sistemas isolados |
| **AI Employee tipo "SDR"** | Novo `BotType` ou role específico que opera em modo **proativo** (outbound) em vez de reativo (inbound) |
| **Painel SDR unificado** | Dashboard que mostra pipeline de prospecção → enriquecimento → sequência → conversão, com KPIs (reply rate, meeting rate, conversion rate) |
| **Auto-enrollment** | Trigger automático: perfil prospectado → enriquecido → enrolled numa sequência multicanal |
| **Reply detection + routing** | Quando o prospect responde, pausar a sequência e rotear para o AI Employee ou humano |
| **A/B testing de mensagens** | Variantes de mensagem por step para otimizar reply rate |

## Plano de Implementação

### Fase 1 — SDR Orchestrator (Backend)

**Nova Edge Function `sdr-orchestrator`** que:
1. Recebe um trigger (manual, scheduled, ou automático via lead score)
2. Enriquece o contacto (chama `ai-entity-insights` se necessário)
3. Escolhe/cria a sequência multicanal adequada (baseada em ICP fit + canal preferido)
4. Enrola o contacto na sequência
5. Monitoriza replies e pausa/roteia automaticamente

**Tabela `sdr_campaigns`**: agrupa perfis prospectados + sequência + AI Employee + métricas.
**Tabela `sdr_enrollments`**: estado individual de cada prospect na campanha (enrolled, replied, meeting_set, converted, opted_out).

### Fase 2 — AI Employee SDR Mode

- Adicionar role `sdr_outbound` ao `AGENT_ROLES`
- Novo modo no `ai-employee-executor`: quando `role = sdr_outbound`, o bot opera proativamente — gera mensagens de first-touch e follow-up usando o contexto do `business-context-loader`
- Integrar com `generate-prospecting-message` existente para manter consistência

### Fase 3 — Dashboard SDR

**Nova página `/dashboard/sdr`** com:
- Pipeline visual: Prospectados → Enriquecidos → Em Sequência → Responderam → Reunião → Convertidos
- KPIs: reply rate, positive reply rate, meeting rate, conversion rate
- Lista de campanhas activas com controlo de pausa/retoma
- Feed de actividade em tempo real

### Fase 4 — Auto-pilot & Otimização

- Auto-enrollment via automação (trigger: novo perfil prospectado com ICP fit > 70)
- A/B testing de mensagens com tracking de variantes
- IA sugere ajustes de cadência e tom baseado em reply rates

## Ficheiros a criar/modificar

| Ficheiro | Acção |
|---|---|
| Migration SQL (2 tabelas + RLS) | Criar |
| `supabase/functions/sdr-orchestrator/index.ts` | Criar |
| `src/pages/SDRDashboardPage.tsx` | Criar |
| `src/hooks/useSDRCampaigns.ts` | Criar |
| `src/components/sdr/SDRPipelineView.tsx` | Criar |
| `src/components/sdr/SDRCampaignCard.tsx` | Criar |
| `src/hooks/useBots.ts` | Modificar — add role `sdr_outbound` |
| `supabase/functions/ai-employee-executor/index.ts` | Modificar — add SDR outbound mode |
| `src/routes/sales/ProspectingRoutes.tsx` | Modificar — add rota SDR |

## Riscos

1. **Anti-spam**: Necessário respeitar limites de envio por canal (WhatsApp Business API limits, email warm-up). Usar `inboxSafety.ts` existente + rate limits por campanha.
2. **Opt-out compliance**: Obrigatório tracking de opt-outs com supressão global (já existe `SuppressionsPage`).
3. **Complexidade do executor**: O `ai-employee-executor` já tem 1676 linhas — o modo SDR deve ser modular, não inline.

## Conclusão

**Não é necessário construir um módulo novo do zero.** A estratégia é criar uma **camada de orquestração SDR** que conecta os componentes existentes (prospecção + enrichment + sequências + AI employees) num fluxo unificado, e adicionar o dashboard de visibilidade.

