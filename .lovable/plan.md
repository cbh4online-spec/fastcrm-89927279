

# Adicionar contagem de ficheiros na badge da aba Ficheiros

## Alterações

### 1. `src/hooks/useEntityCounts.ts`
- Adicionar `files: number` ao `EntityCounts` interface
- Contar documentos na tabela `entity_documents` filtrados por `entity_type` e `entity_id`
- Retornar `files: filesCount`

### 2. `src/components/entity/EntityHorizontalTabs.tsx`
- Garantir que o `counts` prop inclui `files` e que a tab `'files'` recebe a contagem via `getCount`

### 3. Detail pages (Lead, Company, Contact)
- Já passam `counts` às tabs — como `files` será adicionado ao `EntityCounts`, a badge aparecerá automaticamente

| Ficheiro | Acção |
|----------|-------|
| `src/hooks/useEntityCounts.ts` | Adicionar query `entity_documents` + campo `files` |
| `src/components/entity/EntityHorizontalTabs.tsx` | Incluir `files` no tipo `counts` |

