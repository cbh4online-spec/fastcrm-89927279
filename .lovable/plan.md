

# Fix: Isolamento de Pipeline Stages por Workspace

## Problema

O ficheiro `src/components/marketing/PipelineTriggersPanel.tsx` (linha 60) consulta `pipeline_stages` **sem filtrar por `workspace_id`**, carregando estágios de todos os workspaces. Os hooks principais em `usePipelineStages.ts` já estão correctos.

## Solução

Adicionar `.eq("workspace_id", currentWorkspace.id)` à query no `PipelineTriggersPanel.tsx` (linha 60), alinhando com o padrão já usado nos restantes hooks.

### Ficheiro: `src/components/marketing/PipelineTriggersPanel.tsx`

**Antes:**
```typescript
.from('pipeline_stages')
.select('id, name, pipeline_id')
.order('position', { ascending: true });
```

**Depois:**
```typescript
.from('pipeline_stages')
.select('id, name, pipeline_id')
.eq('workspace_id', currentWorkspace.id)
.order('position', { ascending: true });
```

Alteração de 1 linha, sem impacto noutros componentes.

