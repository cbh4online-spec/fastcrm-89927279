

# Widget de Próximos Aniversários no Dashboard

## Alterações

### 1. Novo hook `src/hooks/useUpcomingBirthdays.ts`

Query a `contacts`, `leads` e `companies` onde `birth_date IS NOT NULL` e `deleted_at IS NULL`. No cliente, calcula os próximos aniversários nos próximos 30 dias comparando mês/dia com a data actual. Retorna lista ordenada por proximidade com: `name`, `entityType`, `entityId`, `birthDate`, `daysUntil`.

### 2. Novo componente `src/components/dashboard/UpcomingBirthdaysWidget.tsx`

Card na sidebar direita do dashboard (col-span-4) com:
- Header: ícone `Cake` + título "Próximos Aniversários"
- Lista dos próximos aniversários (max 5-6 items)
- Cada item: avatar com iniciais, nome, tipo de entidade (badge), dias até ao aniversário
- "Hoje" em destaque (badge verde) para aniversários do dia
- Estado vazio e skeleton loading
- Click navega para o detalhe da entidade

### 3. Integrar no Dashboard

Em `Dashboard.tsx`, adicionar `<UpcomingBirthdaysWidget />` na coluna direita (col-span-4), depois de `PLGSignalsFeed`.

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useUpcomingBirthdays.ts` | Criar hook que agrega aniversários dos próximos 30 dias |
| `src/components/dashboard/UpcomingBirthdaysWidget.tsx` | Criar widget com lista de aniversários |
| `src/pages/Dashboard.tsx` | Adicionar widget na sidebar direita |

