
Objetivo: garantir que os dois links mostram os produtos esperados e que “todos os produtos” ficam visíveis de forma clara.

1) Diagnóstico confirmado
- O problema não é falta de dados no backend: os anúncios existem.
- Há dois pontos a causar confusão:
  - Escopo de workspace diferente:
    - `/marketplace/metodopare` usa o workspace do slug `metodopare`.
    - `/dashboard/c2c` usa o workspace ativo na sessão (atualmente pode ser outro, ex. “Simples e Divertido”).
  - UI de catálogo parcial:
    - Em `C2CPublicMarketplace` e `C2CMarketplace`, a home mostra carrosséis com cortes (`slice`) e não uma grelha completa por defeito.

2) Plano de implementação
- Ajustar escopo de workspace no dashboard C2C:
  - Criar um helper de sincronização por query param `ws` (slug).
  - Aplicar no mínimo em:
    - `src/pages/c2c/C2CMarketplace.tsx`
    - `src/pages/c2c/C2CSellersAdmin.tsx`
  - Garantir que links vindos do marketplace público para gestão usam `?ws=<slug>` de forma consistente.
- Mostrar catálogo completo de produtos:
  - `src/pages/c2c/C2CPublicMarketplace.tsx`
    - Corrigir uso de `showBrowse` para realmente abrir “catálogo completo”.
    - Adicionar secção “Todos os anúncios” com contagem e botão “Carregar mais” (paginação cliente simples).
  - `src/pages/c2c/C2CMarketplace.tsx`
    - Manter carrosséis (destaques/recentes), mas adicionar também “Todos os anúncios” sem cortes por categoria.
- Melhorar clareza de contexto:
  - Exibir no topo um badge/label com workspace ativo no dashboard C2C para evitar leituras erradas de contagem.

3) Decisão funcional (assumida)
- Público (`/marketplace/...`): continuar a mostrar apenas anúncios `active + approved`.
- Dashboard (`/dashboard/c2c`): catálogo completo do workspace ativo (com opção de “carregar mais”); não misturar workspaces.

4) Detalhes técnicos
- Ficheiros alvo:
  - `src/pages/c2c/C2CPublicMarketplace.tsx`
  - `src/pages/c2c/C2CMarketplace.tsx`
  - `src/pages/c2c/C2CSellersAdmin.tsx`
  - (novo) `src/hooks/useC2CWorkspaceScope.ts` para reaproveitar lógica `?ws=slug`.
- Sem alterações de base de dados/migrações.
- RLS não é a causa principal neste caso (dados estão acessíveis; o bloqueio é de escopo e renderização parcial).

5) Validação (fim-a-fim)
- Abrir:
  - `/marketplace/metodopare`
  - `/dashboard/c2c?ws=metodopare`
- Confirmar que:
  - A contagem de cartões em “Todos os anúncios” corresponde ao total de anúncios ativos/aprovados desse workspace.
  - O dashboard não mostra anúncios de outro workspace.
  - O comportamento mantém-se após refresh e navegação entre páginas C2C.
