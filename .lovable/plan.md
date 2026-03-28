

## Gestão de etiquetas + tags inline no header

### 1. Painel de gestão de etiquetas do workspace

Criar uma página/dialog acessível via Definições ou menu para CRUD de `workspace_tags`:
- Listar todas as tags com nome e cor
- Editar nome e cor (color picker simples com as 7 cores predefinidas)
- Eliminar tags (com confirmação)
- Criar novas tags

**Ficheiro:** `src/pages/WorkspaceTagsPage.tsx` — página standalone em `/dashboard/settings/tags`
- Usa `useWorkspaceTags`, `useCreateWorkspaceTag`, `useUpdateWorkspaceTag`, `useDeleteWorkspaceTag` (já existem)
- Tabela simples com ações inline (editar cor, renomear, eliminar)

**Rota:** Adicionar em `App.tsx` sob `/dashboard/settings/tags`

**Navegação:** Adicionar link "Etiquetas" no menu de definições/sidebar

### 2. Tags inline ao lado do nome no header

Alterar `EntityDetailHeader.tsx` para mostrar as tags da entidade como badges clicáveis ao lado do nome, com um botão `+` que abre o `EntityTagEditor` inline.

```text
[← ] [Avatar]  Nome do Lead  [🔥 Quente] [85 pts] [marketing] [vip] [+]
                Atualizado há 2h
```

**Alterações no `EntityDetailHeader.tsx`:**
- Receber `tags: string[]` e `onTagsChange: (tags: string[]) => void` como props
- Mostrar tags como badges coloridas (reutilizando as cores do `workspace_tags`)
- Botão `+` que ao clicar abre um popover com o `EntityTagEditor`
- Clicar no `×` de uma tag remove-a

**Alterações no `EntityDetailLayout.tsx`:**
- Passar `entity.tags` e callback `onFieldChange('tags', ...)` ao header

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/pages/WorkspaceTagsPage.tsx` | Criar — CRUD de tags do workspace |
| `src/App.tsx` | Alterar — adicionar rota `/dashboard/settings/tags` |
| `src/components/layout/AdaptiveSidebar.tsx` ou nav config | Alterar — link para gestão de etiquetas |
| `src/components/entity/EntityDetailHeader.tsx` | Alterar — mostrar tags + botão `+` ao lado do nome |
| `src/components/entity/EntityDetailLayout.tsx` | Alterar — passar tags e callback ao header |

