

# Restringir Edição de RFQs a Admin/Super Admin

## Problema Atual
Qualquer utilizador com acesso à página de detalhe do RFQ pode editar campos (título, data limite, condições de pagamento, etc.) desde que o RFQ não esteja "awarded" ou "closed". Não há verificação de role.

## Solução

### 1. Adicionar verificação de role na página de detalhe (`src/pages/procurement/RFQDetailPage.tsx`)

- Importar `useUserRole` e `useWorkspace` para obter o role do utilizador
- Alterar a lógica de `isEditable` para incluir verificação de role:
  ```
  isEditable = status não finalizado AND (isSuperAdmin OR isAdmin OR workspaceRole === "owner" OR workspaceRole === "admin")
  ```
- Esconder botões de ação (Enviar RFQ, Adicionar Fornecedor, Adjudicar) para utilizadores sem permissão
- Mostrar badge "Apenas leitura" para utilizadores sem permissão de edição

### 2. Proteção no hook `useUpdateRFQ` (`src/hooks/useRFQ.ts`)

- Adicionar verificação de role antes de executar o update, rejeitando com erro se o utilizador não for admin/super_admin/owner

### Ficheiros a editar
- `src/pages/procurement/RFQDetailPage.tsx` — adicionar imports de role e condicionar `isEditable`
- `src/hooks/useRFQ.ts` — adicionar guard no `useUpdateRFQ`

