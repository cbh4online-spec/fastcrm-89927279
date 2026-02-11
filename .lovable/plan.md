

# Desenvolver Gestao Completa de Sponsors

## Situacao Atual

A pagina de gestao de sponsors (`/dashboard/c2c/sponsors`) apenas lista candidaturas recebidas e permite aprovar/rejeitar. Faltam funcionalidades essenciais para uma gestao completa.

## O Que Vamos Adicionar

### 1. Tabs de Navegacao
Reorganizar a pagina em 3 tabs:
- **Candidaturas** - Lista de candidaturas (funcionalidade atual melhorada)
- **Sponsors Ativos** - Gestao CRUD dos parceiros ativos na `store_sponsors`
- **Estatisticas** - Metricas de sponsors (contagem por tier, receita, etc.)

### 2. Tab "Candidaturas" (melhorada)
- Filtros por status (Todas, Pendentes, Aprovadas, Rejeitadas)
- Contadores por status no topo
- Indicador visual mais claro do tier com cores
- Acoes adicionais: marcar como "active" apos pagamento, expirar manualmente

### 3. Tab "Sponsors Ativos" (nova)
- Tabela/lista de todos os sponsors em `store_sponsors`
- Botao "Adicionar Sponsor" manualmente (sem candidatura)
- Editar sponsor existente (nome, logo, website, descricao, tier, ativo/inativo)
- Eliminar sponsor
- Toggle ativo/inativo rapido
- Reordenar por drag ou botoes de posicao

### 4. Tab "Estatisticas" (nova)
- Cards resumo: total sponsors ativos, por tier (gold/silver/bronze)
- Total de candidaturas pendentes
- Receita estimada mensal (baseada nos tiers ativos)

## Seccao Tecnica

### Ficheiros a Modificar

| Ficheiro | Alteracao |
|---|---|
| `src/pages/c2c/C2CSponsorAdmin.tsx` | Reescrever com Tabs, adicionar filtros, tab sponsors ativos com CRUD, tab estatisticas |
| `src/hooks/useStoreAds.ts` | Adicionar hooks: `useUpdateStoreSponsor`, `useDeleteStoreSponsor`, `useToggleSponsorActive` |
| `src/hooks/useSponsorApplications.ts` | Adicionar hook para contar candidaturas por status |

### Detalhes de Implementacao

**Novos hooks em `useStoreAds.ts`:**
- `useUpdateStoreSponsor(workspaceId)` - mutation para update de campos do sponsor
- `useDeleteStoreSponsor(workspaceId)` - mutation para remover sponsor
- `useToggleSponsorActive(workspaceId)` - mutation rapida para toggle `is_active`

**Pagina `C2CSponsorAdmin.tsx`:**
- Usar `Tabs` do Radix UI (ja disponivel no projeto)
- Tab Candidaturas: manter logica atual + filtros por status com botoes/badges
- Tab Sponsors Ativos: lista com Dialog para criar/editar, botao delete com confirmacao
- Tab Estatisticas: cards simples com contagens e calculo de receita estimada
- Dialog de criacao/edicao de sponsor com campos: nome, logo_url, website_url, descricao, tier (select), ativo (switch), sort_order

