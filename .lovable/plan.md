

# Notificações automáticas de aniversário

## Situação actual

- `birth_date` existe em `contacts`, `leads` e `companies`
- Template `contact-birthday` já existe em `entityAutomationTemplates.ts` mas não há backend que o execute
- `contact_birthday` **não está** no tipo `AutomationTrigger` do `useAutomations.ts`
- Não existe edge function nem cron job para verificar aniversários

## Alterações

### 1. Edge function `supabase/functions/check-birthdays/index.ts`

Função que:
- Consulta `contacts`, `leads` e `companies` onde `EXTRACT(MONTH FROM birth_date) = mês actual` AND `EXTRACT(DAY FROM birth_date) = dia actual`
- Filtra por `deleted_at IS NULL`
- Para cada match, insere notificação em `admin_notifications` com `type: 'birthday'`, título "🎂 Aniversário: {nome}" e metadata com entity type/id
- Usa service role key (chamada por cron, sem user auth)

### 2. DB function + cron job (via SQL insert tool)

- Criar função SQL `check_birthdays_today()` que faz o mesmo em SQL puro (mais eficiente) ou agendar a edge function via `pg_cron` + `pg_net`
- Cron: executa diariamente às 08:00 UTC

### 3. Adicionar `contact_birthday` ao tipo `AutomationTrigger`

Em `src/hooks/useAutomations.ts`, adicionar `"contact_birthday"` ao union type.

### 4. Ícone de aniversário no `NotificationsDropdown`

Em `src/components/layout/NotificationsDropdown.tsx`, adicionar `birthday: <Cake>` ao mapa `typeIcons`.

| Ficheiro | Acção |
|----------|-------|
| `supabase/functions/check-birthdays/index.ts` | Criar edge function que verifica aniversários do dia |
| SQL (insert tool) | Criar cron job diário às 08:00 via pg_cron + pg_net |
| `src/hooks/useAutomations.ts` | Adicionar `contact_birthday` ao tipo AutomationTrigger |
| `src/components/layout/NotificationsDropdown.tsx` | Adicionar ícone Cake para tipo `birthday` |

