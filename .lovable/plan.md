
# Adicionar edição e eliminação de canais do clube

## Problema

Atualmente só é possível criar canais na comunidade. Não existe forma de editar (nome, descrição, ícone, cor, privacidade, preço) nem eliminar canais existentes.

## Solução

Reutilizar o `AddChannelDialog` existente, transformando-o num dialog de criação/edição unificado, e adicionar as mutações necessárias para update e delete.

## Alterações

### 1. Adicionar mutações em `src/hooks/useForumMutations.ts`

Criar duas novas funções:

- **`useUpdateForumCategory(workspaceId)`** -- faz `.update()` na tabela `forum_categories` com os campos editados (name, description, icon, color, is_private, is_read_only, is_paid, price). Recalcula o slug a partir do nome.
- **`useDeleteForumCategory(workspaceId)`** -- faz `.delete()` na tabela `forum_categories` pelo id. Invalida a query `forum-categories`.

### 2. Refatorar `src/components/community/AddChannelDialog.tsx`

- Renomear para suportar modo de edição: aceitar prop opcional `channel` com os dados do canal existente
- Se `channel` estiver presente, pré-preencher todos os campos do formulário (nome, descrição, ícone, cor, toggles, preço)
- Alterar o título do dialog: "Editar Canal" vs "Adicionar Canal"
- Alterar o botão de submissão: "Guardar" vs "Criar Canal"
- Adicionar botão "Eliminar Canal" (com confirmação) quando em modo de edição
- No submit, chamar `useUpdateForumCategory` em vez de `useCreateForumCategory` quando estiver a editar

### 3. Adicionar ações de edição na listagem de canais

Nas páginas que listam canais (`FastClubPage.tsx` e `ForumPage.tsx`), adicionar um botão de edição (ícone de lápis ou menu de contexto) em cada canal da sidebar, que abre o `AddChannelDialog` em modo de edição com os dados do canal selecionado.

## Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/hooks/useForumMutations.ts` | Editar -- adicionar `useUpdateForumCategory` e `useDeleteForumCategory` |
| `src/components/community/AddChannelDialog.tsx` | Editar -- suportar modo edição com prop `channel`, pré-preenchimento e botão eliminar |
| `src/pages/community/FastClubPage.tsx` | Editar -- adicionar estado para canal selecionado e botão de edição nos canais |
| `src/pages/community/ForumPage.tsx` | Editar -- mesmo padrão de edição nos canais |

Total: 4 ficheiros editados, 0 criados.

## Secção técnica

### Schema `forum_categories` (campos editáveis)
- `name` (string)
- `slug` (string, recalculado do nome)
- `description` (string | null)
- `icon` (string | null)
- `color` (string | null)
- `is_private` (boolean)
- `is_read_only` (boolean)
- `is_paid` (boolean)
- `price` (number | null)

### Mutação de update
```typescript
supabase.from("forum_categories")
  .update({ name, slug, description, icon, color, is_private, is_read_only, is_paid, price })
  .eq("id", categoryId)
  .eq("workspace_id", workspaceId)
```

### Mutação de delete
```typescript
supabase.from("forum_categories")
  .delete()
  .eq("id", categoryId)
  .eq("workspace_id", workspaceId)
```
