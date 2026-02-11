

# Adicionar Reenvio de Convite para Todos os Estados

## Problema
Atualmente, o botao de reenviar convite so aparece para convites com estado "expirado" ou "revogado". Convites "pendentes" so mostram o botao de revogar, mas o admin pode querer reenviar um convite pendente (por exemplo, se o vendedor nao viu o email).

## Solucao

### Ficheiro: `src/components/c2c/SellerInvitesList.tsx`
- Adicionar o botao de reenvio tambem para convites com estado **"pending"**
- O botao de reenviar aparecera ao lado do botao de revogar nos convites pendentes
- Manter o comportamento atual para expirados e revogados (so reenviar)

### Logica Final de Botoes por Estado

| Estado | Revogar | Reenviar |
|--------|---------|----------|
| Pendente | Sim | **Sim (novo)** |
| Aceite | Nao | Nao |
| Expirado | Nao | Sim |
| Revogado | Nao | Sim |

### Sem alteracoes de base de dados
A funcionalidade de reenvio ja existe no hook `useResendSellerInvite` - apenas precisa de ser exposta na UI para convites pendentes.
