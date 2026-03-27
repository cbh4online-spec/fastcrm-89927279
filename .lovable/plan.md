

# Emails Automáticos de Eventos — Convite, Confirmação e Alerta

## Situação Atual

- Já existe um `send-event-invite` que usa **Resend** (API key externa) para enviar convites
- Já existe um `event-rsvp-respond` que atualiza o RSVP e redireciona para uma página de confirmação
- O domínio de email Lovable (`notify.fastcrm.metodopare.ai`) está configurado mas com DNS falhado — precisa ser corrigido para os emails funcionarem
- Não existem emails de **confirmação** (quando alguém confirma presença) nem de **alerta/lembrete** antes do evento

## Plano

### 1. Corrigir infraestrutura de email

O domínio de email tem DNS falhado. Antes de migrar, é necessário verificar a configuração DNS em **Cloud → Emails**. Enquanto isso, podemos avançar com o scaffolding e templates — os emails começam a ser enviados assim que o DNS estiver verificado.

- Configurar infraestrutura de email (setup_email_infra)
- Scaffolding de emails transacionais (scaffold_transactional_email)

### 2. Criar 3 templates de email transacional

Todos em `supabase/functions/_shared/transactional-email-templates/`:

| Template | Trigger | Dados dinâmicos |
|----------|---------|-----------------|
| `event-invitation` | Ao criar RSVP com email | nome, título evento, data, local, botões confirmar/recusar |
| `event-confirmation` | Quando RSVP muda para "confirmed" | nome, título evento, data, local, link |
| `event-reminder` | 24h antes do evento (cron) | nome, título evento, data, local, link |

Estilo visual alinhado com a identidade da app (cores amber/dark theme, tipografia).

### 3. Migrar `send-event-invite` para transactional email

- Atualizar `useInviteToEvent` em `src/hooks/useEvents.ts` para chamar `send-transactional-email` em vez de `send-event-invite`
- Remover dependência de `RESEND_API_KEY`
- Manter os botões de RSVP (confirmar/recusar) no email usando o `event-rsvp-respond` existente

### 4. Adicionar email de confirmação

- Atualizar `event-rsvp-respond/index.ts` para, após confirmar um RSVP, invocar `send-transactional-email` com template `event-confirmation`
- O convidado recebe um email "Presença confirmada!" com os detalhes do evento

### 5. Criar sistema de lembrete pré-evento

- Criar edge function `event-reminder-cron` que:
  - Busca eventos que começam nas próximas 24h
  - Busca RSVPs confirmados desses eventos
  - Envia email de lembrete via `send-transactional-email` para cada convidado confirmado
  - Marca RSVPs como "reminded" para não duplicar
- Registar pg_cron para executar a cada hora

### Ficheiros criados/alterados

| Ficheiro | Ação |
|----------|------|
| `_shared/transactional-email-templates/event-invitation.tsx` | Novo template |
| `_shared/transactional-email-templates/event-confirmation.tsx` | Novo template |
| `_shared/transactional-email-templates/event-reminder.tsx` | Novo template |
| `_shared/transactional-email-templates/registry.ts` | Registar 3 templates |
| `supabase/functions/event-rsvp-respond/index.ts` | Adicionar envio de email de confirmação |
| `supabase/functions/event-reminder-cron/index.ts` | Nova edge function de lembrete |
| `src/hooks/useEvents.ts` | Migrar para `send-transactional-email` |

