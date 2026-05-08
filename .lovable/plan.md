
# Fase 12 — LeadChef: Inteligência, Automações, Liderança e Mobile

Plano detalhado dividido em 4 sub-fases independentes (12A → 12D), cada uma entregável de forma autónoma. Recomendo executar pela ordem proposta — cada bloco gera dados que o seguinte aproveita.

---

## 12A — Inteligência e Scoring com IA

### Objetivo
Dar ao agente uma sugestão concreta do que fazer a seguir e um score de prioridade, em vez de uma lista de leads "iguais".

### Entregáveis
1. **Lead Score (0–100)** calculado para cada `leadchef_lead_profiles` ativo.
   - Componentes: idade na etapa, nº de interações recentes, fonte, se tem próxima ação definida, conversão histórica de leads semelhantes.
   - Calculado por edge function `leadchef-score-lead` (batch via Trigger.dev — ver 12B — e on-demand quando lead muda de stage).
2. **Sugestão de próxima ação por IA** (Lovable AI Gateway, modelo `google/gemini-3-flash-preview`).
   - Edge function `leadchef-next-action-ai`.
   - Recebe contexto do lead (perfil, histórico, etapa, dias parado) e devolve `{ action, channel, message_draft, reasoning }` via tool calling estruturado.
   - Cache por (lead_id, stage, hash do contexto) durante 24h em `leadchef_ai_suggestions`.
3. **Deteção de leads frios** — view `leadchef_cold_leads` (sem ação > 7 dias OU score < 30) com banner em `/leads` e ação "Reativar com IA".
4. **Página `/leadchef/inteligencia`** — top 10 leads por score, leads frios, sugestões pendentes.

### Tabelas novas
- `leadchef_lead_scores` (lead_id PK, workspace_id, score, breakdown jsonb, calculated_at)
- `leadchef_ai_suggestions` (id, workspace_id, lead_id, kind, payload jsonb, used_at, created_at, expires_at)

### Riscos
- Custo de tokens IA → cache obrigatório + `cost_guard` (já existe no projeto).
- Score determinístico no início (heurística), IA apenas para sugestão textual. Migrar para ML só se houver dados suficientes.

---

## 12B — Automações avançadas com Trigger.dev

### Objetivo
Substituir as automações "fake" (toggle sem efeito) por jobs reais com retry, logs e fallback.

### Entregáveis
1. **Job diário `leadchef-daily-recompute`** (cron 06:00 Lisboa)
   - Recalcula lead scores
   - Deteta leads frios e cria alertas em `leadchef_audit_logs`
   - Envia digest opcional ao agente (email/notificação)
2. **Job a cada 15 min `leadchef-followup-dispatcher`**
   - Verifica leads com `next_action_at <= now()` sem ação executada
   - Cria alerta em `leadchef_actionable_alerts` (já existe)
   - Honra automações desativadas em `leadchef_automation_rules`
3. **Sequências multi-passo** — nova tabela `leadchef_sequences` + `leadchef_sequence_steps` + `leadchef_lead_sequence_runs`.
   - Sequência exemplo: "Pós-demo": Dia 0 lembrete, Dia 2 follow-up, Dia 5 último contacto, Dia 7 marcar frio.
   - Pausa automática se lead muda de stage ou regista resposta.
4. **Página `/leadchef/automacoes`** evoluída — toggle real, ver últimas execuções, próximas execuções, taxa de sucesso.

### Infra
- Tudo em `/trigger/jobs/leadchef.ts` (segue regra Core: lógica async em `/trigger/`).
- Edge functions chamadas: `leadchef-recompute-scores`, `leadchef-dispatch-followups`, `leadchef-advance-sequence`.

### Riscos
- Disparo duplicado → idempotência via `leadchef_lead_sequence_runs.last_step_at`.
- Não enviar mensagens automaticamente sem consentimento — apenas criar **alertas/drafts** que o agente confirma (mantém regra "WhatsApp só por ação do utilizador").

---

## 12C — Relatórios e Dashboard de Liderança

### Objetivo
Dar ao líder/admin uma visão executiva: funil real, conversão por etapa, ranking de agentes, evolução mensal.

### Entregáveis
1. **Página `/leadchef/relatorios`** (gated por `useLeadChefPermissions` ≥ manager)
   - **Funil**: contagem por stage + taxa de conversão entre stages consecutivas.
   - **Velocidade**: tempo médio em cada stage; alertas de stages "lentas".
   - **Conversão**: % de leads new → won (mês corrente vs mês anterior).
   - **Ranking de agentes**: leads ativos, ganhos, taxa de conversão, score médio dos seus leads.
   - **Evolução**: gráfico de leads criados/ganhos por semana (últimas 12).
   - **Origem**: distribuição de leads por origem e qual converte melhor.
2. **Comparação mensal** — selector de período (mês atual, mês anterior, últimos 3 meses, ano).
3. **Exportação PDF** do relatório executivo (reutiliza `pdf.ts` da Fase 11).
4. **CSV de relatório agregado** (já temos infra; adicionar nova entidade `agent_performance`).

### Implementação técnica
- Hooks: `useLeadChefFunnel`, `useLeadChefStageVelocity`, `useLeadChefAgentRanking`, `useLeadChefConversionTrend`.
- Cálculos em SQL via `read_query` (sem novas tabelas — derivado de `leadchef_lead_profiles` + `leads`).
- Cache no React Query com `staleTime: 5 min`.
- Recharts (já no projeto).

### Riscos
- RLS deve continuar a impedir agente comum de ver dados agregados de outros — gate na rota + filtro em todas as queries.

---

## 12D — PWA Mobile + Notificações Push

### Objetivo
Permitir uso em modo "agente no terreno": instalar no telemóvel, push para próximas ações, modo offline básico.

### Entregáveis
1. **Manifest-only PWA** (sem service worker complexo — segue regra do projeto).
   - `manifest.webmanifest` já existe; revisar nome, ícones, theme_color, start_url para `/dashboard/leadchef/today`.
   - Página `/leadchef/instalar` com instruções iOS/Android.
2. **Notificações push** via Web Push API + edge function `leadchef-send-push`.
   - Tabela `leadchef_push_subscriptions` (user_id, workspace_id, endpoint, keys jsonb, enabled).
   - Triggers: lembrete 1h antes do compromisso, alerta de lead sem ação há 3 dias, notificação de nova referência.
   - Job Trigger.dev `leadchef-push-dispatcher` (cron */10 min).
3. **Otimizações mobile do LeadChef**:
   - Bottom nav fixo com 5 ações: Hoje, Leads, Agenda, +Lead (FAB), Mais.
   - Sheets em vez de dialogs em <768px.
   - Lista de leads em modo "card grande" tocável.
   - Verificar zonas de toque ≥44px em todos os botões da Fase 1–11.
4. **Página `/leadchef/notificacoes`** — opt-in, gestão de tipos de notificação.

### Riscos
- Push em iOS exige PWA instalada (Safari 16.4+). Documentar limitação.
- VAPID keys precisam de ser geradas e guardadas em secrets (`VAPID_PUBLIC_KEY` público no código, `VAPID_PRIVATE_KEY` em runtime secret).
- Sem service worker complexo → não há offline real, apenas instalação. Aceitável para MVP.

---

## Critérios de aceitação globais

| Sub-fase | Critério |
|---|---|
| 12A | Score visível em cada lead; sugestão IA gerada e usada pelo menos 1x; leads frios listados |
| 12B | Job Trigger.dev a correr em cron; pelo menos 1 sequência ativa com passos a avançar; toggle real refletido na execução |
| 12C | Líder vê funil + ranking; agente comum bloqueado; export PDF funciona |
| 12D | App instalável em iOS+Android; push recebido em pelo menos 1 dispositivo de teste; zero overflows em 320–430px |

Transversal:
- Build TS limpo; sem console.log; RLS por workspace em todas as novas tabelas; auditoria registada.
- Documentação atualizada em `docs/leadchef.md` + nova `docs/leadchef-phase-12.md`.

---

## Ordem de execução recomendada

```
12A (3–4 mensagens) → 12B (3–4) → 12C (2–3) → 12D (3–4)
```

Total estimado: ~12–15 mensagens de implementação.

---

## Decisões a confirmar antes de implementar

1. **Modelo IA padrão** para sugestões — `google/gemini-3-flash-preview` (rápido/barato) ou `google/gemini-2.5-pro` (mais preciso)?
2. **Sequências** — começar com 1 sequência fixa ("Pós-demo") ou já permitir o líder criar sequências custom?
3. **Push notifications** — implementar só Web Push (browser/PWA) ou também email fallback para quem não ativar push?
4. **Relatórios** — incluir já metas vs realizado (cruzamento com `leadchef_goals`) ou deixar para fase 13?

Diz-me o que preferes em cada ponto e arranco pela 12A.
