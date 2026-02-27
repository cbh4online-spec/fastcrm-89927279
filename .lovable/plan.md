

# Preservar Histórico na Conversão Lead → Contacto/Empresa

## Problema
A `ConvertLeadDialog` apenas copia campos básicos (nome, email, tags) e depois opcionalmente elimina o lead. Não migra conversas, mensagens, atividades, oportunidades, notas, reuniões, etc. — todo o histórico é perdido.

## Solução
Adicionar migração de dados relacionais no `handleConvert` — após criar o contacto/empresa, actualizar todas as tabelas que referenciam `lead_id` para apontar para o novo `contact_id` (ou `company_id`).

## Tabelas a migrar (lead_id → contact_id)

| Tabela | Impacto |
|--------|---------|
| `conversations` | Mensagens e threads |
| `crm_activities` | Timeline de atividades |
| `calendar_events` | Eventos agendados |
| `meetings` | Reuniões |
| `opportunities` | Oportunidades/deals |
| `invoices` | Faturas |
| `form_submissions` | Submissões de formulários |
| `marketing_recipients` | Campanhas |
| `marketing_subscriptions` | Subscrições marketing |
| `conversation_followups` | Follow-ups pendentes |
| `conversation_journey` | Jornada de conversa |
| `conversation_sessions` | Sessões |
| `conversation_signals` | Sinais detectados |
| `lead_behavior_signals` | Sinais comportamentais |
| `product_signals` | Sinais de produto |
| `template_usage_events` | Uso de templates |
| `client_entitlements` | Direitos do cliente |
| `client_requirements` | Requisitos |
| `inbox_action_logs` | Logs de acção inbox |
| `inbox_smart_alerts` | Alertas inbox |
| `fastcrm_proposals` | Propostas |

Para conversão em empresa, migrar para `company_id` onde a coluna existir.

## Alteração

### `src/components/crm/ConvertLeadDialog.tsx`
Após criar o contacto/empresa e antes de eliminar o lead, executar queries de UPDATE em batch para todas as tabelas acima. Usar `Promise.allSettled` para não bloquear em caso de falha parcial. Adicionar indicação visual no stepper ("A migrar histórico...").

Também copiar `notes` e `source` do lead para o novo contacto (actualmente não são copiados).

