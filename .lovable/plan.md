

# Corrigir Stats dos Templates Verticais - workspace_id NULL

## Problema

Os eventos de tracking (`vertical_landing_events`) sao inseridos sem `workspace_id` (valor NULL) porque sao registados anonimamente na landing page publica. No entanto, o hook `useVerticalTemplateStats` filtra por `.eq("workspace_id", currentWorkspace.id)`, o que exclui todos os registos.

Dados confirmados na base de dados: existem 8 eventos para "clinicas" e "ginasios", todos com `workspace_id: null`.

## Solucao

### 1. `src/hooks/useVerticalFunnelManager.ts` (linhas 193-198)

Alterar a query de stats para filtrar apenas por `template_slug`, removendo o filtro por `workspace_id` (ou usando um OR que inclua NULLs):

Antes:
```
.eq("workspace_id", currentWorkspace.id)
.eq("template_slug", templateSlug)
```

Depois:
```
.eq("template_slug", templateSlug)
```

Como o slug ja e unico por vertical, filtrar apenas por slug e suficiente para obter os dados correctos.

### 2. `src/components/vertical-landing/VerticalLandingTracker.tsx`

Melhorar o tracker para tentar passar o `workspace_id` quando disponivel (para que futuros eventos fiquem associados ao workspace). Isto nao e critico mas melhora a qualidade dos dados a longo prazo.

### 3. `src/hooks/useVerticalFunnelManager.ts` (funcao `useVerticalTemplateStats`)

Remover a dependencia de `currentWorkspace?.id` no `enabled` e na query, ja que o filtro principal e o `templateSlug`.

## Resultado

A tab Stats passara a mostrar os dados de views e submissions que ja existem na base de dados.

