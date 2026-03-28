

# Propostas — Indicadores, Filtros e Layout

## Problemas Encontrados

1. **Sem indicadores**: Não há KPI cards (total, aceitas, valor médio, etc.) — só o "Valor total" no subtítulo
2. **Filtros laterais não funcionam**: O `handleFilterSelect` só processa filtros `status_*`. Filtros de Valor, Timing e Performance são ignorados — clicam mas não filtram nada
3. **Tabela transborda**: 10 colunas sem controlo de largura, sem `overflow-x-auto`, o conteúdo sai do ecrã

## Plano de Correção

### 1. KPI Indicator Cards

Adicionar uma row de 5 cards compactos acima da toolbar:

| Card | Cálculo |
|---|---|
| Total Propostas | `filteredProposals.length` |
| Valor Total | Soma de `price` |
| Aceitas | Count com `status === 'accepted'` |
| Taxa de Conversão | `accepted / total × 100` |
| Valor Médio | `totalValue / total` |

Cada card com ícone, valor grande, e label pequeno. Cards clicáveis para filtrar por estado.

### 2. Fix Filtros Laterais

O `handleFilterSelect` atual:
```tsx
if (filterId.startsWith("status_")) {
  setStatusFilter(filterId.replace("status_", ""));
}
// ← value_, timing_, perf_ são completamente ignorados
```

Expandir o `filteredProposals` useMemo para processar todos os filtros:

- **`value_high/medium/low`** → filtrar por ranges de `price`
- **`timing_today/week/month`** → filtrar por `created_at` com comparação de datas
- **`perf_viewed/not_viewed/high_views`** → filtrar por `views_count`

### 3. Tabela Enquadrada no Ecrã

- Envolver a `<Table>` com `<div className="w-full overflow-x-auto">`
- Adicionar `min-w-[1000px]` à Table para garantir legibilidade em scroll
- Truncar colunas longas (Título, Oportunidade, Cliente) com `max-w-[200px] truncate`
- O layout principal já tem `min-w-0` no flex container

### Ficheiro a Modificar

| Ficheiro | Mudança |
|---|---|
| `src/components/proposals/ProposalsList.tsx` | Adicionar KPI cards, fix filter logic, fix table overflow |

