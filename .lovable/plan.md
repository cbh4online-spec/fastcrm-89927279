

# Ativar Atualização Automática no Overview SaaS

## Diagnóstico

As duas queries do `OverviewSection` (`super-admin-overview` e `super-admin-critical-alerts`) usam `useQuery` sem `refetchInterval`. Os dados só carregam ao montar o componente ou ao clicar manualmente em "Atualizar".

## Solução

Adicionar `refetchInterval` às queries para polling automático, e indicar visualmente quando os dados foram atualizados pela última vez.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/super-admin/OverviewSection.tsx` | Adicionar `refetchInterval: 30000` (30s) a ambas as queries + indicador "última atualização" |

### Detalhe

1. **Polling automático**: adicionar `refetchInterval: 30_000` às duas queries (`super-admin-overview` e `super-admin-critical-alerts`) para actualizar a cada 30 segundos
2. **Indicador visual**: junto ao botão "Atualizar", mostrar timestamp da última actualização (ex: "Atualizado às 15:52") usando `dataUpdatedAt` do react-query
3. **Refetch on focus**: adicionar `refetchOnWindowFocus: true` para actualizar quando o utilizador volta ao separador

Sem alterações de base de dados nem novos ficheiros.

