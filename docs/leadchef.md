# LeadChef — Visão geral

Módulo do FastCRM para gestão operacional de leads de demonstração culinária,
clientes, referências, objetivos, equipa e comunicação por templates.

> Linguagem neutra: experiência culinária, demonstração, cliente, equipamento,
> plataforma de receitas. Sem nomes de marcas.

## Rotas

Base: `/dashboard/leadchef` (redirect → `/today`)

| Rota | Página |
| --- | --- |
| `/today` | Resumo do dia, alertas, sugestões |
| `/leads` · `/leads/:leadId` | Lista e detalhe de leads |
| `/agenda` | Compromissos (demo, follow-up, pós-venda) |
| `/clientes` · `/clientes/:leadId` | Clientes (lead won) |
| `/referencias` · `/referencias/:referralId` | Referências e conversão |
| `/objetivos` | Objetivos mensais + progresso |
| `/equipa` · `/equipa/:userId` | Visão de líder/admin |
| `/permissoes` | Capacidades do utilizador atual |
| `/templates` | Templates de mensagem |
| `/automacoes` | Regras de automação simples |

## Tabelas

- `leadchef_lead_profiles` — stage, próxima ação, ciclo
- `leadchef_goals` — objetivos por mês/agente
- `leadchef_referrals` — referências e autorização
- `leadchef_customer_experiences` — ficha digital
- `leadchef_message_templates` — templates por categoria
- `leadchef_automation_rules` — regras toggleáveis

Todas com RLS por `workspace_id`.

## Hooks principais

- `useLeadChefLeads`, `useLeadChefLead`, `useUpdateLeadChefLeadStage`
- `useLeadChefAgenda`, `useCreateLeadChefAppointment`, `useCompleteLeadChefAppointment`
- `useLeadChefClients`, `useCreateLeadChefClientFollowUp`
- `useLeadChefReferrals`, `useConvertLeadChefReferralToLead`
- `useLeadChefCurrentGoal`, `useUpsertLeadChefGoal`, `useLeadChefMonthlyProgress`
- `useLeadChefTeamOverview`, `useLeadChefAgentOverview`, `useLeadChefTeamAlerts`
- `useLeadChefMessageTemplates`, `useLeadChefAutomations`
- `useLeadChefPermissions`

## Permissões

Mapeamento de roles (workspace → LeadChef) em `useLeadChefPermissions`:

- `owner`/`admin` → `admin` (vê tudo + permissões + equipa)
- `agency`/`hr` → `manager` (visão equipa, sem gestão de permissões)
- restantes → `agent` (apenas próprios leads/clientes/referências)

UI gated via `<LeadChefPermissionGate />`. RLS por workspace dá segurança real.

## Fluxo principal

1. Criar lead → stage `new`.
2. Conversar → stage `talking`.
3. Marcar demonstração → stage `demo_scheduled`.
4. Concluir demonstração → stage `demo_done`.
5. Enviar proposta → stage `proposal_decision`.
6. Ganhar venda → stage `won` + `leads.status = completed` + aparece em Clientes.
7. Pós-venda → compromisso pós-venda na agenda.
8. Pedir referência → `leadchef_referrals` (status `new`).
9. Converter referência → cria lead, preenche `converted_lead_id`.

Perdas: stage `lost` + `leads.status = completed`.

## Templates e WhatsApp

- Variáveis suportadas: `{{firstName}}`, `{{fullName}}`, `{{agentName}}`, etc.
- WhatsApp: link `wa.me` com fallback PT (+351). **Sempre iniciado por ação do utilizador.**
- Referências sem `authorization_status = authorized` bloqueiam contacto direto.

## Como testar (resumo)

Ver `docs/leadchef-launch-checklist.md` para o checklist completo.
Fluxo mínimo: criar lead → marcar demo → concluir demo → registar venda → criar
referência → converter referência.

## Limitações conhecidas

- Sem API oficial WhatsApp (apenas link).
- Sem campanhas em massa.
- Sem relatórios PDF.
- Sem app mobile nativa (PWA-friendly).
- Analytics interno apenas se o FastCRM o tiver activo.

## Próximos passos sugeridos

- Notificações push para alertas.
- Exportação CSV de leads/referências.
- Dashboard avançado por período custom.
- Integração com calendário externo.
