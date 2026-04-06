

# Zoho PageSense + SalesIQ — Funcionalidades no FastCRM

## Contexto

O FastCRM já possui uma base sólida de tracking e analytics. Após análise detalhada do código existente e comparação com as funcionalidades do Zoho PageSense e SalesIQ, identifico o que **já existe** e o que **falta implementar**.

### Já implementado (parcial ou total)
- Scroll depth tracking (milestones 25/50/75/100%) — `useSeoUxTracker`
- Section heatmap (grid dias × secções) — `StatsSectionsTab`
- Rage clicks e dead clicks — `useSeoUxTracker`
- Visitor sessions com device, geo, UTMs — `store_visitor_sessions`
- CTA click tracking — múltiplos hooks
- Chat widget conversacional — `ChatWidget` + edge function
- Form submit + form_started tracking — `FunnelStepForm`
- KPIs com benchmarks e tendências — `StatsOverviewTab`

### Funcionalidades PageSense em falta
1. **Form Analytics granular** — field-level drop-off (qual campo causa abandono)
2. **Click heatmap visual** — mapa de cliques sobrepostos na página
3. **Attention map** — tempo médio por zona vertical da página
4. **Session goals / Conversões nomeadas** — objectivos configuráveis com funil
5. **Pop-up inteligente por triggers** — exit intent, scroll %, tempo na página, inatividade
6. **On-page surveys/polls** — micro-questionários inline
7. **Push notifications web** — notificações browser para re-engagement

### Funcionalidades SalesIQ em falta
8. **Visitor scoring em tempo real** — pontuação do visitante baseada em comportamento (páginas, tempo, scroll, cliques)
9. **Visitor routing inteligente** — encaminhar chat para agente certo por critério
10. **Proactive chat triggers** — chat abre automaticamente por condição (tempo, scroll, exit intent)
11. **Visitor intelligence panel** — painel lateral com perfil completo do visitante activo
12. **Canned responses / respostas rápidas** — templates de resposta no chat
13. **Chat transcripts e analytics** — métricas de tempo de resposta, satisfação, volume

## Plano de Implementação (prioridade por impacto)

### Fase 1 — Form Analytics + Pop-ups Inteligentes (maior ROI)

**1a. Form Field Analytics no VerticalLandingTracker**
- Adicionar eventos `field_focus`, `field_blur`, `form_abandon` com `field_name` e `field_order`
- No `FunnelStepForm`, instrumentar cada campo com onFocus/onBlur que regista o campo
- Ao sair da página com formulário incompleto, enviar `form_abandon` com último campo tocado
- Novo sub-tab "Formulários" no dashboard de stats com: taxa de início, campo com mais abandono, tempo médio por campo

**1b. Pop-up Inteligente (PageSense Polls/Pop-ups)**
- Criar tabela `popup_rules` (workspace_id, trigger_type, trigger_value, content, target_pages, enabled)
- Triggers: `exit_intent`, `scroll_pct`, `time_on_page`, `inactivity`, `page_count`
- Componente `SmartPopupEngine` que corre nas landing pages e loja, avalia regras e mostra pop-up
- Pop-up types: desconto, survey (1-2 perguntas), CTA, newsletter
- Respostas gravadas em `popup_responses`
- UI de gestão em Settings do funil

### Fase 2 — Visitor Scoring + Proactive Chat

**2a. Visitor Scoring em Tempo Real**
- Criar função `compute_visitor_score` que pontua: páginas visitadas (+5), scroll >75% (+10), CTA click (+15), tempo >60s (+5), form_started (+20)
- Gravar score em `store_visitor_sessions.visitor_score`
- Classificar: Frio (<20), Morno (20-50), Quente (>50)
- Mostrar badge de temperatura no painel de visitantes

**2b. Proactive Chat Triggers**
- Adicionar coluna `proactive_rules` em `chat_widget_configs` (JSON array de regras)
- Regras: score >= X, tempo na página > Y, scroll > Z%, exit intent
- O `ChatWidget` avalia regras e abre automaticamente com mensagem personalizada
- Log de proactive opens em `chat_events`

### Fase 3 — Click Heatmap + Attention Map + Visitor Panel

**3a. Click Heatmap (PageSense Click Map)**
- No tracker, capturar `element_click` com coordenadas normalizadas (% do viewport)
- Dashboard: overlay visual com pontos de calor (CSS grid com opacity/intensidade)
- Filtro por device e período
- Mostrar top 10 elementos mais clicados

**3b. Attention Map**
- Usar dados de `section_view` + `section_exit` + `time_on_section_ms` já existentes
- Calcular tempo médio por faixa vertical (cada 10% da página)
- Visualização: barra lateral com gradiente verde→vermelho

**3c. Visitor Intelligence Panel (SalesIQ)**
- Componente sidebar que mostra o visitante activo: páginas visitadas, tempo, device, score, histórico de chat, lead associado
- Acessível a partir do inbox/chat e da lista de visitantes da loja

### Fase 4 — Goals, Canned Responses, Chat Analytics

**4a. Session Goals**
- Tabela `conversion_goals` (workspace_id, name, goal_type, goal_config, target_value)
- Goal types: page_visit, form_submit, cta_click, scroll_depth, time_on_site
- Dashboard de goals com taxa de conclusão e tendência

**4b. Canned Responses no Chat**
- Tabela `chat_canned_responses` (workspace_id, shortcut, title, content, category)
- No chat widget admin, UI para gerir respostas
- Atalho "/" no campo de resposta para pesquisar e inserir

**4c. Chat Analytics**
- Métricas: tempo médio de primeira resposta, duração média, satisfação (thumbs up/down), volume por hora/dia
- Tab "Chat Analytics" no dashboard

## Ficheiros a Criar/Editar

| Ficheiro | Ação |
|---|---|
| **Migração SQL** | Tabelas `popup_rules`, `popup_responses`, `conversion_goals`, `chat_canned_responses`; coluna `visitor_score` em `store_visitor_sessions` |
| `src/components/funnels/FunnelStepForm.tsx` | Editar — field-level tracking |
| `src/components/vertical-landing/VerticalLandingTracker.tsx` | Editar — click coords, form abandon, element clicks |
| `src/components/smart-popup/SmartPopupEngine.tsx` | Criar — motor de pop-ups inteligentes |
| `src/components/smart-popup/PopupRulesManager.tsx` | Criar — UI de gestão de regras |
| `src/components/funnels/stats/StatsFormsTab.tsx` | Criar — form field analytics |
| `src/components/funnels/stats/StatsClicksTab.tsx` | Criar — click heatmap visual |
| `src/components/funnels/stats/StatsAttentionTab.tsx` | Criar — attention map |
| `src/components/funnels/stats/StatsGoalsTab.tsx` | Criar — goals dashboard |
| `src/hooks/useVisitorScore.ts` | Criar — cálculo de score |
| `src/components/chat-widget/CannedResponsesPanel.tsx` | Criar — respostas rápidas |
| `src/components/chat-widget/ChatAnalyticsTab.tsx` | Criar — analytics de chat |
| `src/components/store/VisitorIntelPanel.tsx` | Criar — painel de visitante |
| `src/components/funnels/stats/statsHelpers.ts` | Editar — helpers para form analytics e click data |

## Critérios de Aceitação
- Form analytics mostra drop-off por campo com recomendação automática
- Pop-ups disparam por exit intent, scroll e tempo, com rate limiting (1x por sessão)
- Visitor score calculado em tempo real e visível no painel
- Click heatmap renderiza overlay visual com intensidade
- Proactive chat abre automaticamente quando score > threshold
- Goals configuráveis com tracking automático
- Canned responses acessíveis via atalho "/" no chat
- Todos os dados respeitam GDPR (consent flags)
- RLS em todas as novas tabelas (escopado por workspace_id)

## Proposta de Faseamento
Recomendo começar pela **Fase 1** (Form Analytics + Pop-ups) — são as funcionalidades com maior impacto em conversão e as mais pedidas em ferramentas tipo PageSense. Posso implementar as 4 fases sequencialmente.

