

# Gate de Acesso a Comunidade: Registo + Aprovacao

## Problema Actual

A pagina publica `/club/:slug` mostra todo o conteudo livremente. Apos registo, o utilizador fica imediatamente autenticado mas nao existe verificacao de membership -- nao ha necessidade de ser aprovado para aceder.

## Solucao

Criar um fluxo de acesso com 3 estados:

1. **Visitante (nao autenticado)** -- ve a pagina publica com CTA para registar
2. **Registado mas pendente** -- ve um ecra de "pedido pendente" apos registo, a aguardar aprovacao do admin
3. **Membro aprovado** -- redireccionado para o dashboard interno (`/dashboard/fastclub`)

## Fluxo

```text
Visitante --> Regista-se (/club/:slug/auth)
         --> Cria conta + cria registo em community_members (status: "pending")
         --> Redireccionado para /club/:slug
         --> PublicCommunityPage detecta user autenticado + status "pending"
         --> Mostra ecra "Pedido de adesao enviado, aguarda aprovacao"

Admin aprova no painel --> status muda para "active"
         --> Membro acede /club/:slug
         --> Detecta status "active" --> redireciona para /dashboard/fastclub
```

## Ficheiros a Alterar

| Ficheiro | O que muda |
|---|---|
| `src/pages/community/PublicCommunityPage.tsx` | Adicionar verificacao de membership: se user autenticado, verificar se e membro e o status |
| `src/pages/community/CommunityAuthPage.tsx` | Apos signup, criar registo em `community_members` com status "pending" |
| `src/hooks/usePublicCommunity.ts` | Novo hook `usePublicMembershipStatus` para verificar status do user na comunidade |

## Detalhes Tecnicos

### 1. Novo hook: `usePublicMembershipStatus(workspaceId, userId)`

Verifica se o utilizador autenticado e membro da comunidade:
- Procura em `workspace_members` (membros directos do workspace)
- Procura em `community_members` (membros da comunidade por email/user_id)
- Retorna: `{ status: "none" | "pending" | "active" | "workspace_member", isLoading }`

### 2. CommunityAuthPage -- criar membership apos signup

No `handleFinalSubmit`, apos `signUp` com sucesso:
- Criar registo em `community_members` com `status: "pending"`, `email`, `name`, `workspace_id`
- Isto garante que o admin pode ver e aprovar o pedido

### 3. PublicCommunityPage -- logica de acesso

Apos verificar autenticacao:
- Se `status === "workspace_member"` ou `status === "active"`: redirecionar para `/dashboard/fastclub`
- Se `status === "pending"`: mostrar ecra de espera com mensagem "O teu pedido de adesao esta a ser analisado"
- Se `status === "none"` (autenticado mas sem pedido): mostrar a pagina publica normalmente com CTA para pedir adesao

### Ecra de estado "Pendente"

```text
+-----------------------------------------------+
|  [Logo] Nome da Comunidade                     |
|                                                |
|  [Icone relogio]                               |
|  "Pedido de Adesao Enviado"                    |
|  "O teu pedido esta a ser analisado pela       |
|   equipa. Seras notificado quando for aprovado"|
|                                                |
|  [Botao: Voltar ao inicio]                     |
+-----------------------------------------------+
```

### Sem alteracoes na base de dados

A tabela `community_members` ja tem o campo `status` (text) e ja suporta o valor "pending". Apenas precisamos de utilizar este campo correctamente no fluxo.
