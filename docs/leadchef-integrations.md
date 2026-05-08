# LeadChef — Integrações e dados externos

> Documentação preparatória para futuras integrações. Esta fase entrega CSV
> (import/export), .ics (calendário) e impressão para PDF via browser.
> Não inclui integrações oficiais com APIs proprietárias.

## Entidades principais

| Entidade | Tabela | Notas |
| --- | --- | --- |
| Lead | `leads` + `leadchef_lead_profiles` | Perfil LeadChef adiciona stage, próxima ação, ciclo |
| Cliente | `leadchef_lead_profiles` (stage = `won`) | Status pós-venda em `client_status` |
| Referência | `leadchef_referrals` | Inclui `authorization_status` e `converted_lead_id` |
| Compromisso | `crm_appointments` | Tipo, hora agendada, link a lead/cliente |
| Objetivo | `leadchef_goals` | Por (workspace, user, mês) |
| Experiência cliente | `leadchef_customer_experiences` | jsonb livre |
| Template | `leadchef_message_templates` | Categoria, corpo com variáveis |
| Automação | `leadchef_automation_rules` | Regras toggleáveis |
| Audit log | `leadchef_audit_logs` | Acções operacionais |

## Eventos de auditoria

Disponíveis em `src/utils/leadchef/audit.ts`:

- `lead_created`, `lead_stage_changed`
- `appointment_created`, `appointment_completed`
- `referral_created`, `referral_converted`
- `client_followup_created`
- `goal_updated`
- `template_used`
- `import_completed`, `export_created`
- `customer_experience_updated`

## Importação CSV

- Endpoint UI: `/dashboard/leadchef/ferramentas?tab=importar`
- Limite: **1000 linhas / 5MB por importação**
- Separadores: `,` ou `;` (auto-detect)
- Campos canónicos: ver `src/utils/leadchef/fieldMapping.ts`
- Deteção de duplicados por telefone normalizado e email (ver `duplicates.ts`)
- Cria registos em `leads` + `leadchef_lead_profiles`
- Regista evento `import_completed`

## Exportação CSV

- Endpoint UI: `/dashboard/leadchef/ferramentas?tab=exportar`
- UTF-8 com BOM, separador `;` (compatível com Excel pt-PT)
- Cabeçalhos em português
- Entidades: leads, clients, referrals, agenda, goals, experiences
- Filtros: período, etapa, agente (apenas managers/admin)
- Restrição automática para agentes (vê só os próprios)

## Calendário (.ics)

- Botão "Adicionar ao calendário" em cada compromisso da agenda.
- Compatível com Google Calendar, Apple Calendar, Outlook (importação manual).
- Sem sincronização bidirecional.

## Impressão / PDF

- Geração via `window.print()` numa janela temporária estilizada.
- Disponível no detalhe de lead/cliente.
- Sem dependência de bibliotecas pesadas.

## Webhooks futuros (planeado)

Eventos a expor quando a infraestrutura estiver pronta:

```json
{
  "event": "leadchef.lead.created",
  "workspace_id": "uuid",
  "data": { "lead_id": "uuid", "name": "...", "origin": "..." },
  "occurred_at": "ISO8601"
}
```

Outros eventos previstos: `leadchef.lead.stage_changed`,
`leadchef.appointment.completed`, `leadchef.referral.converted`.

## Notas de privacidade

- As exportações podem conter dados pessoais (nome, telefone, email).
- O ficheiro deve ser tratado com o mesmo cuidado que o ecrã de detalhe.
- Referências exportadas incluem `authorization_status` para indicar
  consentimento.
- Experiências de cliente incluem dados sensíveis — limitadas ao próprio
  utilizador para agentes.

## Limitações conhecidas

- Sem WhatsApp Business API (apenas link `wa.me`).
- Sem sincronização Google/Apple/Outlook (apenas `.ics` download).
- Sem restore automático de backup nesta fase.
- Sem API pública aberta nesta fase.
