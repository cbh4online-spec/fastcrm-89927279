

## Editar e Apagar Grupos

### O que falta
Não existe UI nem hooks para editar ou apagar grupos. Só é possível criar e visualizar.

### Alterações

#### 1. Hook `useGroups.ts` — adicionar `useUpdateGroup` e `useDeleteGroup`

- **`useUpdateGroup`**: mutation que faz `sb.from("groups").update({...}).eq("id", groupId)` — permite alterar nome, descrição, tipo, objectivo, telegram_chat_id
- **`useDeleteGroup`**: mutation que faz `sb.from("groups").delete().eq("id", groupId)` — apaga o grupo e membros/mensagens em cascata (se FK configurada) ou soft-delete via `is_archived = true`

#### 2. `GroupsView.tsx` — menu de contexto nos cards

Adicionar `DropdownMenu` com ícone `MoreVertical` no canto superior direito de cada card de grupo:
- **Editar** → abre dialog pré-preenchido (reutiliza o formulário de criação com os valores actuais)
- **Apagar** → abre `AlertDialog` de confirmação antes de executar

O dialog de edição será o mesmo formulário de criação, mas com:
- Título "Editar Grupo"
- Campos pré-preenchidos com `group.name`, `group.description`, etc.
- Botão "Guardar alterações"

#### 3. `GroupChat.tsx` — botão de editar/apagar no header

Adicionar `DropdownMenu` no header do chat (junto ao botão de membros) com opções "Editar grupo" e "Apagar grupo", usando os mesmos dialogs.

### Ficheiros alterados
- `src/hooks/useGroups.ts` — 2 novos hooks
- `src/components/groups/GroupsView.tsx` — dropdown nos cards + dialog de edição + dialog de confirmação de apagar
- `src/components/groups/GroupChat.tsx` — dropdown no header com editar/apagar

