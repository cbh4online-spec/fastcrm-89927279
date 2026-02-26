

# Adicionar Menções (@nome) nas Notas Internas

## Alterações

### 1. Migração: coluna `mentions` na tabela `entity_notes`
- Adicionar coluna `mentions TEXT[] DEFAULT '{}'` à tabela `entity_notes` para guardar os `user_id`s mencionados

### 2. Componente `MentionTextarea` (novo)
- `src/components/entity/MentionTextarea.tsx`
- Textarea com dropdown de sugestões que aparece ao digitar `@`
- Usa `useWorkspaceMembers()` para obter a lista de membros
- Filtra membros em tempo real conforme o utilizador escreve após `@`
- Insere `@Nome` no texto e guarda o `user_id` num array de menções
- Dropdown posicionado junto ao cursor com avatar + nome do membro

### 3. Actualizar `EntityTeamSection.tsx`
- Substituir `<Textarea>` por `<MentionTextarea>` no `TeamNotesPanel`
- Passar array de `mentions` (user_ids) ao `addNote.mutate()`
- Actualizar `addNote` mutation para incluir `mentions` no insert
- Na renderização das notas, destacar `@Nome` com estilo visual (badge/bold com cor primária)

### 4. Componente de renderização de menções
- Função `renderNoteContent(content)` que converte `@Nome` em spans estilizados dentro do texto da nota

## Ficheiros

| Ficheiro | Acção |
|----------|-------|
| Migração SQL | Adicionar coluna `mentions` a `entity_notes` |
| `src/components/entity/MentionTextarea.tsx` | **Novo** — textarea com autocomplete de menções |
| `src/components/entity/EntityTeamSection.tsx` | Integrar MentionTextarea + guardar/renderizar menções |

