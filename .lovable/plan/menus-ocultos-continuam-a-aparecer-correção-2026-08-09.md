# Menus ocultos continuam a aparecer — correção

## O que foi verificado

Na base de dados, a workspace Ajax Systems tem 81 regras "Oculto" gravadas (grupos *Definições*, *Operações*, *Relatórios*, sub-grupos como *Administração*, *RH*, *Compras*, e dezenas de páginas). Ou seja, o backoffice está a gravar corretamente — o problema está no lado de quem consome as regras.

Duas causas confirmadas por leitura do código:

1. **A barra lateral não se atualiza.** As regras são lidas com cache de 60 segundos e sem qualquer sinal de atualização em tempo real. Enquanto a sessão do utilizador estiver aberta, a sidebar continua a mostrar a lista antiga — só muda depois de recarregar a página (e mesmo assim pode servir cache).

2. **Nem todos os sítios respeitam as regras.** Só a `AdaptiveSidebar`, a `InvoiceXpressSidebar` e a pesquisa global as aplicam. Ficam de fora:
   - `WatidySidebar` (terceira barra lateral disponível),
   - `MobileBottomNav` (navegação mobile),
   - o botão **+ Criar** e outros atalhos rápidos,
   - o acesso direto por URL: uma página "oculta" continua a abrir se o utilizador escrever o endereço.

## O que vai mudar

1. **Atualização imediata**: as regras passam a ser subscritas em tempo real; ao gravar no backoffice, as sessões abertas dessa workspace atualizam a barra lateral sem recarregar.
2. **Cobertura total**: `WatidySidebar`, `MobileBottomNav` e o menu **+ Criar** passam a filtrar itens ocultos e a marcar os bloqueados com cadeado, tal como já acontece na barra principal.
3. **Bloqueio de navegação direta**: uma rota marcada como Oculta ou Com cadeado deixa de abrir por URL — o utilizador é reencaminhado para o painel inicial (ocultas) ou vê um ecrã de "sem acesso" com o motivo (cadeado). Continua a ser apenas UI/navegação; a proteção dos dados mantém-se nas políticas de segurança da base de dados.
4. **Coerência do "Ocultar tudo"**: quando um grupo é ocultado, o grupo desaparece mesmo que existam páginas soltas com regra própria "Visível" apenas por herança antiga.

## Notas técnicas

- `src/hooks/useWorkspaceMenuOverrides.ts`: reduzir `staleTime`, adicionar `refetchOnWindowFocus`, e subscrever `postgres_changes` na tabela `workspace_menu_overrides` filtrada por `workspace_id` para invalidar a query.
- `src/components/layout/WatidySidebar.tsx` e `src/components/layout/MobileBottomNav.tsx`: aplicar `useMenuOverrideMap()` + `resolveRouteVisibility` / `resolveNavGroupVisibility` / `resolveTopGroupVisibility`, com o mesmo padrão já usado na `AdaptiveSidebar`.
- Botão **+ Criar** (ações rápidas na `AdaptiveSidebar`): filtrar ações cuja rota resolva para `hidden`/`locked`.
- Novo guard `MenuVisibilityGuard` aplicado no layout autenticado: resolve a rota atual via `ROUTE_MANIFEST` (match por `href`) e bloqueia `hidden` (redirect `/dashboard`) e `locked` (ecrã de bloqueio). Super admin passa sempre.
- `src/components/layout/AdaptiveSidebar.tsx`: manter grupos ocultos fora do resultado mesmo quando têm subsecções com itens, e não descartar grupos cujos itens diretos estejam vazios mas com subsecções visíveis.
- Sem alterações de base de dados.

## Critérios de aceitação

- Ocultar um grupo no backoffice reflete-se na sessão aberta da workspace em segundos, sem recarregar.
- Itens ocultos não aparecem em nenhuma barra lateral (adaptive, watidy, IX), no menu mobile, no **+ Criar** nem na pesquisa ⌘K.
- Escrever o URL de uma página oculta reencaminha para o painel; numa página com cadeado mostra aviso de bloqueio.
- Outras workspaces sem regras mantêm-se inalteradas.
