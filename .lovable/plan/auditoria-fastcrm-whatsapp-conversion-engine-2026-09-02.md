# Auditoria — FastCRM WhatsApp Conversion Engine

Auditoria factual, só leitura. Nada foi alterado.

## Resumo executivo

O motor foi implementado como **camada pura + infraestrutura de dados**, mas **nunca foi ligado ao produto**: não há interface, não há seeding, não há cron e as tabelas estão vazias em produção.

Evidência direta na base de dados:
`whatsapp_template_playbook` = **0 linhas**, `lead_commercial_profile` = **0 linhas**, `next_best_actions` = **0 linhas**, famílias distintas = **0**.

## A — Biblioteca de templates (famílias)

O CHECK da tabela aceita as 7 famílias (`lead_new, qualification, scheduling, proposal, closing, reactivation, post_sale`) e `src/lib/whatsapp/engine/families.ts` tem as etiquetas. Mas apenas **2 famílias têm conteúdo em código** (`lead_new`, `qualification`) e **nenhuma existe em dados**.

| Família | Estado |
|---|---|
| Nova Lead | 🟡 seeds em código, 0 em BD |
| Qualificação | 🟡 seeds em código, 0 em BD |
| Agendamento / Proposta / Fecho / Reativação / Pós-venda | 🔴 só o enum |

## Templates Nova Lead (LEAD_NEW_01..06)

Todos os 6 existem em `src/lib/whatsapp/engine/seeds.ts` (linhas 38, 62, 86, 109, 133, 156) com corpo, objetivo, timing (`timing_min/max_minutes`), `use_conditions`, `exclusion_conditions` (`stop_contact`, `opted_out`, `has_replied`), variáveis obrigatórias, fallbacks, CTA, KPI, prioridade e `execution_mode` (LEAD_NEW_01 = `assisted`).
**Operacionais: não.** Não estão inseridos em nenhum workspace, não têm trigger ligado nem enviador. 🟡

## Templates de Qualificação (QUALIFY_01..05)

Os 5 existem nos seeds (linhas 183–270) e são referenciados pelo motor (`decide.ts`): QUALIFY_01 objetivo, 02 problema, 03 consequência, 04 timing, 05 agendamento. O que falta é a escrita das respostas — não há extração de resposta que preencha `lead_commercial_profile`, nem ligação a `opportunities`/pipeline. 🟡

## Variáveis dinâmicas

`src/lib/whatsapp/engine/render.ts` declara as **24 variáveis pedidas** em `ENGINE_VARIABLES`, faz deteção (`detectVariables`), resolução com fallbacks, limpeza de espaçamento e `assertNoUnresolvedVariables()`. `canAutoSend` é falso quando falta qualquer variável obrigatória; `guards.ts` tem `hasUnresolvedVariables()` e o motivo de paragem `unresolved_variables`.
Contudo, **não existe nenhum resolvedor** que traga valores reais de lead/contacto/proposta/reunião. Estado por variável: todas **existentes mas incompletas** (motor sim, fonte de dados não). O bloqueio de envio com variáveis por resolver está 🟢 implementado ao nível de biblioteca, ⚪ por validar em runtime (nunca corre).

## Perfil comercial da lead

`lead_commercial_profile` (migração `drizzle/migrations/0007_...`) cobre: objetivo, problema principal, consequência, timing, objeção principal, `first_reply_at`, `last_outbound_at`, `last_inbound_at`, `next_action_at`, `snooze_until`, `stop_contact`, `metadata`. RLS + GRANTs corretos.
Origem, campanha, anúncio, funil, produto/serviço, data de entrada, temperatura, score e estágio vivem em `leads` / campos existentes; proposta em `proposals`; agendamento em `meetings`; última mensagem em `messages`/`conversations`.
**Nenhuma linha escrita** — nada popula esta tabela. 🟡

## Next Best Action

Existe motor determinístico real, não só enum: `decide.ts` (288 linhas) e cópia para edge em `supabase/functions/_shared/wa-engine/decide.ts`. Cobre bloqueios (STOP_CONTACT, sem telefone, perdida, proposta aceite), snooze, `postpone` → LEAD_NEW_06, objeção → HANDLE_OBJECTION, proposta → FOLLOW_UP_PROPOSAL, reunião → WAIT, escada de qualificação e `FOLLOWUP_LADDER` (LEAD_NEW_02 aos 15 min, 03 às 4h, 04 às 24h, 05 às 48h) e REACTIVATE no fim.

O exemplo pedido confirma-se: lead sem resposta, 1 outbound, 18 min desde o último → devolve `ASK_QUESTION` com `templateCode: "LEAD_NEW_02"` (a ação é `ASK_QUESTION`, não `SEND_MESSAGE`, no primeiro degrau).

Existe também a edge function `whatsapp-engine-recommend` que agrega contexto (perfil, reuniões, conversas), valida JWT + `workspace_members` e persiste em `next_best_actions`. **Nunca é invocada** — nenhum ficheiro do `src/` a chama e não há cron/Trigger.dev associado. 🟡

## Next Best Message (interface)

🔴 **Não existe.** Nenhum componente de "Próxima Melhor Ação" na ficha de lead/oportunidade para WhatsApp, nenhum hook (`src/hooks/` não tem nada do género), nenhum botão Enviar/Editar/Alternativas/Ignorar. Os componentes `NextBestActionsPanel`/`NextBestActionDetail` do Context OS são de outro módulo (estratégia) e não consomem este motor.

## Automações e paragens

`guards.ts` em `whatsapp-pro-sequence-dispatch` define as razões de paragem (`opted_out`, `stop_contact`, `automation_paused`, `lead_replied`, `meeting_scheduled`, `proposal_accepted`, `lead_lost`, `snoozed`, `unresolved_variables`), com distinção terminal vs. adiar, e `canDispatch()` no motor repete a validação imediatamente antes do envio (anti-corrida). Opt-out é fail-closed.
Falta confirmar em runtime: idempotência real de envio, mudança de estágio como paragem e criação automática de follow-up futuro (`next_action_at` nunca é escrito). 🟡

## Analytics

`useWhatsAppAnalytics.ts` mede enviados, entregues, lidos, falhados, taxas de entrega/leitura e série diária **por campanha** — não por template do playbook. Não há tempo até resposta, taxa de resposta, agendamentos, propostas, vendas, receita nem opt-outs cruzados com template. Dashboard "Performance de Templates WhatsApp" e comparação entre templates: 🔴 inexistentes.

## Agendamentos já existentes (reaproveitar)

`meetings`, `useMeetings`, `useMeetingAutomations`, `useSchedulingAnalytics`, `MeetingOutcomeModal`/`MeetingCloseModal` (inclui no-show), `useWhatsAppAppointments` + `WhatsAppAppointmentsSection` + `ScheduleAppointmentDialog`, `useWhatsAppReminders`, `whatsapp-send-scheduled-reminders`, `whatsapp_scheduled_reminders` (0 linhas). Confirmação, lembretes e no-show já têm base — **não duplicar**.

## Propostas já existentes (reaproveitar)

`proposals` (20 linhas), `useProposals`, `useProposalAnalytics`, `useProposalAI`, `useGenerateProposalCopy`, `useConvertProposalToOrderNote`. Existem automações genéricas em `useSmartWorkflows`. Não encontrei templates com os códigos `sales_followup` nem `proposal_review` no playbook (tabela vazia).

## Teste funcional

Testes unitários existem: `src/test/whatsapp/conversion-engine.test.ts` (193 linhas) cobre decisão, render e seeds.
Fluxo ponta-a-ponta (nova lead → template → sem resposta → próximo → resposta → paragem → qualificação → agendamento): ⚪ **NECESSITA TESTE MANUAL** — impossível validar sem seeding e sem UI, e não seria seguro executar envios em produção.

## Tabela de estado

| Área | Estado | Evidência |
|---|---|---|
| Estrutura de dados | 🟡 | migração 0007 aplicada, tabelas a 0 linhas |
| Templates Nova Lead | 🟡 | seeds.ts 38–178, 0 em BD |
| Qualificação | 🟡 | seeds.ts 183–298, sem escrita de respostas |
| Variáveis | 🟡 | render.ts completo, sem resolvedor de dados |
| Next Best Action | 🟡 | decide.ts + edge function, nunca invocada |
| Next Best Message | 🔴 | sem componente nem hook |
| Automações/guardas | 🟡 | guards.ts + canDispatch, sem execução |
| Analytics | 🔴 | só métricas de campanha |
| Interface | 🔴 | nenhuma página do engine |
| Testes | 🟡 | unitários verdes, E2E por fazer |

## Percentagem de conclusão

Critério: cada bloco pesa por camadas — dados (25%), lógica (25%), ligação/execução (25%), interface e verificação (25%). Uma camada só conta se existir e estiver ligada.

- Estrutura de dados: **60%** (esquema pronto, sem dados nem seeding)
- Templates Nova Lead: **50%** (conteúdo completo, não persistido nem operacional)
- Qualificação: **45%**
- Variáveis: **55%** (motor sim, fonte de dados não)
- Next Best Action: **65%** (lógica sólida, sem execução agendada)
- Next Best Message: **5%**
- Automações: **40%**
- Analytics: **10%**
- Interface: **0%**
- Testes: **35%**

**Estado global: ~37% concluído** (média ponderada pelo esforço dos blocos, com interface e analytics a pesar mais).

## Gap analysis

**P0 — Crítico**
1. Seeding do playbook por workspace (os 11 templates para `whatsapp_template_playbook`).
2. Resolvedor de variáveis a partir de lead/contacto/utilizador/proposta/reunião.
3. Invocação da `whatsapp-engine-recommend` (cron/Trigger.dev + gatilho por evento) e escrita de `next_best_actions`.
4. Escrita do `lead_commercial_profile` (`last_inbound_at`, `last_outbound_at`, `first_reply_at`, `next_action_at`) a partir de mensagens.

**P1 — Importante**
5. Painel "Próxima Melhor Ação" na ficha de lead/oportunidade (Enviar / Editar / Alternativas / Ignorar).
6. Captura das respostas de qualificação para o perfil comercial.
7. Idempotência e log de envio por template (`whatsapp_sequence_logs` ligado ao código do playbook).
8. Página de gestão do playbook de templates.

**P2 — Evolução**
9. Analytics por template (resposta, tempo até resposta, agendamentos, propostas, receita, opt-outs).
10. Famílias em falta: agendamento, proposta, fecho, reativação, pós-venda.

## Próximo desenvolvimento recomendado

Terminar **NOVA LEAD + QUALIFICAÇÃO + NEXT BEST ACTION**, pela ordem P0 1→4 e depois P1 5. Tecnicamente **ainda não estamos preparados** para avançar para AGENDAMENTO + NO-SHOW: o motor não produz nenhuma recomendação persistida nem tem interface, pelo que a fase seguinte não teria em que assentar. A base de agendamentos já existente (`meetings`, `useWhatsAppReminders`, `whatsapp-send-scheduled-reminders`) fica reservada para reaproveitamento, sem duplicação.
