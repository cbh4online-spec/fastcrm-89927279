

# Adicionar pesquisa por nome de empresa no Account Brief

## Problema
Atualmente o diálogo "Adicionar Conta" exige domínio como campo obrigatório. O utilizador quer poder adicionar contas apenas pelo nome da empresa (ex: "Zoltrix – Soluções Integradas, Lda"), sem precisar saber o domínio.

## Alterações

### 1. Hook `useAccountBriefAccounts.ts` — tornar domain opcional
- Alterar `createAccount` para aceitar domain como opcional
- Se domain não for fornecido, usar string vazia ou placeholder derivado do nome
- O `normalized_domain` será vazio quando não há domínio

### 2. Dialog em `AccountBriefAccountsPage.tsx`
- Alterar validação: permitir criar conta se tiver **nome OU domínio** (em vez de exigir domínio)
- Reorganizar campos: Nome primeiro (como campo principal), Domínio segundo (opcional)
- Texto do placeholder e labels ajustados
- Botão habilitado quando `newName || newDomain`

### 3. Barra de pesquisa existente
- A pesquisa por nome já funciona (filtro `name.ilike` no hook) — sem alterações necessárias

### Ficheiros afetados
- `src/hooks/useAccountBriefAccounts.ts` — domain opcional no mutationFn
- `src/pages/AccountBriefAccountsPage.tsx` — reordenar campos, validação flexível

