# Acesso permanente ao Global Admin para jorge.cardoso@digital4ads.pt

## Diagnóstico (verificado)

- O utilizador **já tem** o papel `super_admin` na base de dados (registo em `user_roles` ligado ao seu perfil). Não é um problema de dados nem de RLS.
- O acesso perde-se por causa da **personalização de menus por workspace**: na workspace *Ajax Systems* estão gravados os overrides `top_group: definicoes = hidden` e `nav_group: administracao = hidden`. A entrada "Super Admin" (`/n`) pertence a esse grupo, por isso:
  - desaparece da barra lateral (`AdaptiveSidebar`, `InvoiceXpressSidebar`),
  - o `MenuVisibilityGuard` redireciona para `/dashboard` mesmo quando é o super admin a aceder por URL (comportamento hoje intencional).
- O atalho do escudo na barra superior navega para `/super-admin`, uma rota **que não existe** (as rotas reais são `/n` e `/n-v2`), pelo que o botão leva a uma página não encontrada.

## Decisões de produto

1. Um super admin nunca deve poder ficar sem entrada para o Global Admin, independentemente da workspace ativa e dos overrides de menu.
2. A pré-visualização "como a workspace vê" continua útil, mas não pode bloquear as rotas de administração global (`/n`, `/n-v2/*`) nem esconder o atalho permanente.
3. O acesso continua a depender do papel `super_admin` (validado no servidor) — não se cria nenhuma exceção por email nem lista fixa no código.

## Plano de implementação

1. **Atalho sempre visível**: corrigir o botão do escudo na `TopBar` para navegar para `/n-v2` (backoffice atual) e mostrá-lo sempre que `isSuperAdmin` for verdadeiro, sem depender de overrides.
2. **Guard de menus**: em `MenuVisibilityGuard`, ignorar overrides quando o utilizador é `super_admin` e a rota pertence à administração global (`/n`, `/n-v2/*`) — deixa de haver redirecionamento para `/dashboard`.
3. **Barra lateral**: nas duas sidebars, garantir que a entrada "Super Admin" (`key: n`) é sempre apresentada para utilizadores com `super_admin`, mesmo que o grupo esteja oculto para a workspace.
4. **Pesquisa global**: incluir a entrada de Global Admin nos resultados para super admins, para existir sempre um caminho por teclado.
5. **Validação**: confirmar com a workspace *Ajax Systems* ativa que (a) o atalho aparece, (b) `/n-v2` abre, (c) para um utilizador sem `super_admin` nada disto fica visível e o backoffice continua a devolver "Acesso restrito".

## Notas técnicas

- Ficheiros envolvidos: `src/components/layout/TopBar.tsx`, `src/components/layout/MenuVisibilityGuard.tsx`, `src/components/layout/AdaptiveSidebar.tsx`, `src/components/layout/InvoiceXpressSidebar.tsx`, `src/components/layout/GlobalSearch.tsx`.
- Fonte de verdade do papel: `useUserRole()` (perfil → `user_roles`) e, no servidor, `is_super_admin()` / RLS. Sem alterações de base de dados.
- Nenhuma política RLS é relaxada: a mudança é apenas de navegação/UI.

## Riscos

- Se no futuro se pretender testar "vista de cliente" enquanto super admin, será necessário um interruptor explícito de pré-visualização — fica fora deste âmbito, mas o código ficará preparado para o acrescentar.
