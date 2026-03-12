

# Corrigir Receita Fechada no Dashboard

## Problema
A receita fechada está a 0,00€ porque o cálculo usa `updated_at` para determinar quando um negócio foi ganho. Isto é frágil — qualquer edição posterior ao negócio altera o `updated_at`, e negócios ganhos antes desta semana (como os de 2 de Março) desaparecem do radar.

A tabela `opportunities` não tem um campo `won_at` dedicado.

## Solução

### 1. Migração SQL
- Adicionar coluna `won_at TIMESTAMPTZ` à tabela `opportunities`
- Criar trigger que preenche `won_at = NOW()` automaticamente quando `status` muda para `'won'` (e limpa quando sai de `'won'`)
- Backfill: definir `won_at = updated_at` para todos os registos que já estão com `status = 'won'`

### 2. Corrigir query no hook `useWeeklyPerformance.ts`
- Alterar a query de opportunities won para filtrar por `won_at` em vez de `updated_at`
- Seleccionar `won_at` no select

### Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| Nova migração SQL | Adicionar coluna `won_at`, trigger + backfill |
| `src/hooks/useWeeklyPerformance.ts` | Usar `won_at` em vez de `updated_at` no filtro de deals ganhos |

