

# Verificação de Lead Existente por Email no Booking Público

## Resumo
Quando o visitante preenche os dados no formulário de agendamento, o sistema grava imediatamente e verifica se já existe um lead ou contacto com o mesmo email no workspace. Se existir, mostra uma mensagem informativa e associa ao registo existente.

## Implementação

### 1. Edge Function `public-booking/index.ts` — action `save_lead`
Após guardar o `booking_lead`, verificar nas tabelas `leads` e `contacts` se existe registo com o mesmo email no mesmo workspace:
- Query `leads` por `email = guest_email` e `workspace_id`
- Query `contacts` por `email = guest_email` e `workspace_id`
- Retornar na resposta um campo `existing_match` com tipo (`lead` ou `contact`), nome e id do registo encontrado
- Se existir lead, atualizar o `booking_lead` com referência ao lead existente (campo metadata ou similar)

### 2. UI `PublicBookingPage.tsx` — feedback ao visitante
- Ao receber resposta do `save_lead` com `existing_match`, mostrar um banner informativo (não bloqueante):
  - "Bem-vindo de volta, {nome}!" ou "Já temos o seu registo."
- O fluxo continua normalmente para a escolha de horário — não bloqueia
- Guardar o match info para uso posterior na confirmação

### Ficheiros a editar
- `supabase/functions/public-booking/index.ts` — lógica de verificação no `handleSaveLead`
- `src/pages/PublicBookingPage.tsx` — exibir feedback do match

