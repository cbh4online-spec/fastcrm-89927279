

# Seletor de vista de perfil na sidebar

## Objetivo
Adicionar um seletor rápido de perfil (Vendedor, Gestor, Diretor, CEO) na sidebar para permitir pré-visualizar como cada perfil vê o menu — sem alterar o perfil guardado na base de dados.

## Como funciona

### 1. Estado local de override no hook `useAdaptiveDashboard`
- Adicionar um estado `overrideFunction` (guardado em `localStorage` para persistir entre reloads).
- Expor `setSalesFunctionOverride(fn)` e `clearOverride()`.
- O `salesFunction` retornado pelo hook usa o override quando presente, caso contrário usa o valor do perfil.

### 2. Seletor visual na sidebar (junto ao nome do utilizador)
- Dropdown compacto ao lado do role label atual (ex: "Gestor de Vendas ▾").
- Ao clicar, mostra as 4 opções: Vendedor, Gestor, Diretor, CEO.
- Ao selecionar, aplica o override — a sidebar e o dashboard mudam instantaneamente.
- Badge visual "Preview" quando o override está ativo, com botão para voltar ao perfil real.

### Ficheiros alterados
- `src/hooks/useAdaptiveDashboard.ts` — adicionar override state + localStorage
- `src/components/layout/AdaptiveSidebar.tsx` — adicionar dropdown de seleção de perfil no header

