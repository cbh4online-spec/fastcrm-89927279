

# Booking Pages: Captura antecipada de leads + Customização avançada

## Problema atual

1. Os dados do visitante (nome/email) só são pedidos **depois** de escolher dia e hora — se abandonar antes, perde-se o lead
2. Os horários são fixos (9h-18h, sem fins-de-semana) e não respeitam a disponibilidade real configurada no sistema
3. Não há opção para configurar dias da semana, horários, campo de telefone, ou vincular a uma disponibilidade existente

## Solução

### Fase 1 — Captura de dados antes da disponibilidade

Reestruturar a `PublicBookingPage` em 3 steps:

```text
Step 1: Dados do visitante     Step 2: Escolher dia/hora     Step 3: Confirmação
┌─────────────────────┐        ┌─────────────────────┐       ┌─────────────────────┐
│ Nome*                │        │ Calendário de dias  │       │ ✓ Agendamento       │
│ Email*               │ ────▶  │ Slots disponíveis   │ ────▶ │   confirmado!       │
│ Telefone (se ativo)  │        │                     │       │                     │
│ Mensagem (opcional)  │        │ [Confirmar]         │       │                     │
└─────────────────────┘        └─────────────────────┘       └─────────────────────┘
```

- Ao submeter o Step 1, guardar imediatamente um **registo parcial** (nova tabela `booking_leads` ou chamada à edge function) com nome/email/telefone + booking_page_id + timestamp
- Mesmo que o visitante abandone no Step 2, os dados ficam guardados para follow-up

### Fase 2 — Customização avançada do calendário

**Novos campos na tabela `booking_pages`** (migração SQL):

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `working_days` | integer[] | `{1,2,3,4,5}` | Dias da semana ativos (0=dom, 6=sáb) |
| `start_hour` | text | `'09:00'` | Hora de início |
| `end_hour` | text | `'18:00'` | Hora de fim |
| `availability_id` | uuid (nullable) | null | Vincular a disponibilidade existente |
| `require_phone` | boolean | false | Pedir telefone |
| `custom_message_label` | text | null | Label de campo mensagem opcional |

**Nova tabela `booking_leads`** para guardar leads parciais:

| Campo | Tipo |
|-------|------|
| id | uuid PK |
| booking_page_id | uuid FK |
| guest_name | text |
| guest_email | text |
| guest_phone | text (nullable) |
| guest_message | text (nullable) |
| status | text (partial / booked) |
| event_id | uuid (nullable) |
| created_at | timestamp |

**No BookingPageModal** — adicionar secções:
- Checkboxes para dias da semana ativos
- Seletores de hora início/fim
- Toggle "Pedir telefone"
- Campo de label para mensagem opcional
- Seletor de disponibilidade existente (opcional, override dos horários manuais)

**Na PublicBookingPage**:
- Usar `working_days` para filtrar dias no calendário
- Usar `start_hour`/`end_hour` para gerar slots (em vez do fixo 9-18)
- Se `availability_id` estiver definido, carregar `availability_slots` reais para gerar horários por dia da semana
- Respeitar `availability_exceptions` (dias bloqueados)

**Na edge function `public-booking`**:
- Novo endpoint/path para guardar lead parcial (Step 1)
- Atualizar lead existente com event_id quando booking é concluído (Step 2)

## Ficheiros

- **Migração SQL**: Adicionar colunas a `booking_pages` + criar tabela `booking_leads`
- **Editar**: `src/pages/PublicBookingPage.tsx` — flow multi-step, lead capture first
- **Editar**: `src/components/scheduling/BookingPageModal.tsx` — campos de customização
- **Editar**: `src/hooks/useBookingPages.ts` — tipos atualizados
- **Editar**: `supabase/functions/public-booking/index.ts` — guardar leads parciais + atualizar no booking

