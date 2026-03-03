

## Adicionar "Forçar Atualização" ao Feature Registry

### Contexto

O Feature Registry atualmente é um array estático (`FEATURE_REGISTRY`) carregado em memória. Não há mecanismo para forçar re-leitura ou invalidar cache.

### Plano

#### 1. Adicionar botão "Forçar Atualização" na toolbar do `FeatureRegistrySection`

- Colocar botão com ícone `RefreshCw` ao lado do botão "Exportar"
- Ao clicar, invalida a query cache do `useFeatureRegistry` e força re-render com timestamp
- Animação de spin no ícone durante o refresh
- Toast de confirmação "Registry atualizado"

#### 2. Atualizar `useFeatureRegistry` para suportar refresh

- Adicionar estado `refreshKey` (timestamp) que força re-cálculo dos `useMemo`
- Expor função `forceRefresh` que incrementa o key
- Isto garante que filtros, stats e categorias são todos recalculados

### Ficheiros a editar

| Ficheiro | Alteração |
|---|---|
| `src/hooks/useFeatureRegistry.ts` | Adicionar `forceRefresh` com `refreshKey` state |
| `src/components/super-admin/FeatureRegistrySection.tsx` | Botão "Forçar Atualização" na toolbar |

