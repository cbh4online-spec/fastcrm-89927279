
# Adicionar Logs de Auditoria Detalhados a Todos os Modulos

## Problema

Varios modulos do Super Admin fazem accoes administrativas sem registar nos logs de auditoria. Apenas 5 accoes estao a ser registadas (em WorkspacesSection, PlansSection, BillingSection, AlertsSection e AIUsageSection). As restantes accoes criticas nao deixam rasto.

## Accoes sem Auditoria (a corrigir)

| Modulo | Accao | Tipo de log a adicionar |
|---|---|---|
| **MenuPermissionsSection** | Actualizar permissoes de menu | `permissions_updated` |
| **UsersSection** | Adicionar user a workspace | `user_added_to_workspace` |
| **UsersSection** | Remover user de workspace | `user_removed_from_workspace` |
| **UsersSection** | Alterar status do user | `user_status_changed` |
| **WorkspaceMembersPanel** | Adicionar membro | `member_added` |
| **WorkspaceMembersPanel** | Alterar role de membro | `member_role_updated` |
| **WorkspaceMembersPanel** | Remover membro | `member_removed` |
| **CreateWorkspaceDialog** | Criar workspace | `workspace_created` |
| **CreateUserWithWorkspaceDialog** | Criar utilizador | `user_created` |
| **ModerationSection** | Aprovar/rejeitar item | `moderation_reviewed` |
| **ModerationSection** | Actualizar filtros | `moderation_filters_updated` |
| **AlertsSection** | Dispensar incidente | `incident_dismissed` |

## Implementacao

Cada accao recebe uma chamada `supabase.rpc("log_admin_action", {...})` no `onSuccess` ou apos a operacao principal (seguindo o padrao ja usado nos modulos existentes).

### Ficheiro 1: `src/components/super-admin/MenuPermissionsSection.tsx`
- Adicionar log apos `updatePermissions` com detalhes das roles e menus alterados

### Ficheiro 2: `src/components/super-admin/UsersSection.tsx`
- Adicionar log em `addToWorkspace.onSuccess` com user ID, workspace ID e role
- Adicionar log em `removeFromWorkspace.onSuccess` com user ID e workspace ID
- Adicionar log em `updateStatus.onSuccess` com user ID e novo status

### Ficheiro 3: `src/components/super-admin/WorkspaceMembersPanel.tsx`
- Adicionar log em `addMember.onSuccess` com user ID e role
- Adicionar log em `updateRole.onSuccess` com user ID, role antiga e nova
- Adicionar log em `removeMember.onSuccess` com user ID

### Ficheiro 4: `src/components/super-admin/CreateWorkspaceDialog.tsx`
- Adicionar log em `createWorkspace.onSuccess` com nome, slug e plano

### Ficheiro 5: `src/components/super-admin/CreateUserWithWorkspaceDialog.tsx`
- Adicionar log em `createUser.onSuccess` com email e workspace (se criado)

### Ficheiro 6: `src/components/super-admin/ModerationSection.tsx`
- Adicionar log apos `reviewItem.mutate` com item ID e accao (approved/rejected)
- Adicionar log apos `updateFilters.mutate` com filtros alterados

### Ficheiro 7: `src/components/super-admin/AlertsSection.tsx`
- Adicionar log na accao de dismiss (ja tem para resolve, falta dismiss)

### Ficheiro 8: `src/components/super-admin/LogsSection.tsx`
- Adicionar novos filtros no dropdown: "Permissoes", "Membros", "Moderacao", "Utilizadores"
- Mostrar nome do admin (fazer join com profiles) em vez de apenas UUID

## Padrao de Codigo (exemplo)

Todas as chamadas seguem este formato consistente:
```text
await supabase.rpc("log_admin_action", {
  p_action_type: "user_created",
  p_target_type: "user",
  p_target_id: userId,
  p_workspace_id: workspaceId || null,
  p_details: { email, plan, workspace_name }
});
```

## Ficheiros a modificar

| Ficheiro | Accao |
|---|---|
| `src/components/super-admin/MenuPermissionsSection.tsx` | +1 log |
| `src/components/super-admin/UsersSection.tsx` | +3 logs |
| `src/components/super-admin/WorkspaceMembersPanel.tsx` | +3 logs |
| `src/components/super-admin/CreateWorkspaceDialog.tsx` | +1 log |
| `src/components/super-admin/CreateUserWithWorkspaceDialog.tsx` | +1 log |
| `src/components/super-admin/ModerationSection.tsx` | +2 logs |
| `src/components/super-admin/AlertsSection.tsx` | +1 log (dismiss) |
| `src/components/super-admin/LogsSection.tsx` | Novos filtros + nome do admin |

## Resultado esperado

- Todas as 12 accoes administrativas ficam registadas nos logs
- Cada log inclui detalhes contextuais (quem, o que, onde)
- Filtros actualizados para encontrar facilmente cada tipo de accao
- Nome do admin visivel na tabela em vez de UUID
