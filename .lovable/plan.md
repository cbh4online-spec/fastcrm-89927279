

# Briefs Apenas Manual + Consumo de Créditos

## Problema

Os Daily Briefs e Strategic Briefs geram-se automaticamente ao abrir certas páginas (CommandCenter, WeeklyDashboard, CEODailyBriefTab), gastando créditos de IA sem controlo do utilizador.

## Alterações

### 1. Remover auto-geração (3 ficheiros)

**`src/pages/CommandCenter.tsx`** — remover o `useEffect` (linhas 20-25) que chama `generateDailyBrief()` automaticamente.

**`src/pages/WeeklyDashboard.tsx`** — remover o `useEffect` (linhas 37-41) que chama `generateDailyBrief()` automaticamente.

**`src/components/ceo-copilot/CEODailyBriefTab.tsx`** — remover o `useEffect` (linhas 15-20) e o `autoGenRef` que disparam `generateDailyBrief()` automaticamente.

### 2. Adicionar pricing rules para briefs (DB Migration)

Inserir regras de preço na tabela `credit_pricing_rules`:

```sql
INSERT INTO credit_pricing_rules (action_key, label, description, credits_cost, module, category, is_active)
VALUES
  ('daily_brief', 'Daily Revenue Brief', 'Gerar resumo executivo diário', 2, 'strategy', 'intelligence', true),
  ('weekly_brief', 'Brief Executivo Semanal', 'Gerar brief estratégico semanal', 3, 'strategy', 'intelligence', true)
ON CONFLICT DO NOTHING;
```

### 3. Consumir créditos antes de gerar (2 hooks)

**`src/hooks/useDailyBrief.ts`** — em `generateDailyBrief()`:
- Importar `useCreditWallet`
- Antes de chamar a edge function, chamar `consumeCredits.mutateAsync({ actionKey: 'daily_brief' })`
- Se falhar (saldo insuficiente), mostrar toast de erro e não prosseguir
- Expor `canAfford('daily_brief')` para desabilitar o botão na UI quando sem créditos

**`src/hooks/useStrategicBriefs.ts`** — em `generateBrief()`:
- Mesma lógica, com `actionKey: 'weekly_brief'`

### 4. UI — indicar custo nos botões

Nos botões "Gerar Brief" / "Gerar novo", mostrar o custo em créditos:
- `"Gerar Brief (2 créditos)"` no daily
- `"Gerar novo (3 créditos)"` no weekly
- Botão disabled quando `!canAfford`

Ficheiros afetados: `DailyBriefWidget.tsx`, `DailyBriefPage.tsx`, `CEODailyBriefTab.tsx`, `StrategicBriefCard.tsx`, `CommandCenter.tsx`

## Resultado

- Briefs nunca se geram automaticamente
- Cada geração consome créditos da carteira do workspace
- Utilizador vê o custo antes de clicar e não pode gerar sem saldo

