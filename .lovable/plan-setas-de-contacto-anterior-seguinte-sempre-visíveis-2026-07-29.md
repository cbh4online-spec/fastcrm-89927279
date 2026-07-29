# Setas de contacto anterior/seguinte sempre visíveis

## Diagnóstico
O controlo já está montado no cabeçalho da ficha (`ENIContactDetailWithSidebar`) e no formulário de edição, mas só aparece quando existe contexto guardado em `sessionStorage`, gravado ao clicar numa linha da lista de Contactos. Se o contacto for aberto por pesquisa global, link direto, breadcrumb, recarregamento da página ou noutro separador, `hasContext` é `false` e o componente devolve `null` — que é exatamente o caso do ecrã atual.

## Decisão de produto
As setas devem estar sempre disponíveis num contacto. Quando não há contexto da lista, usa-se uma ordem por omissão (nome A→Z) sobre os contactos do workspace, indicando ao utilizador que está a percorrer todos os contactos.

## Comportamento
- Com contexto da lista: mantém-se o atual — respeita pesquisa, filtros e ordenação (`Contacto X de Y`).
- Sem contexto: fallback para a lista completa de contactos do workspace ordenada por nome; o contador mostra a posição nesse conjunto.
- Enquanto a lista de fallback carrega, o controlo aparece com as setas desativadas (sem saltos de layout).
- Se o contacto não existir em nenhuma das listas, o controlo continua oculto.
- Atalhos `Alt + ←` / `Alt + →` e o diálogo de alterações por guardar na edição mantêm-se inalterados.

## Estrutura técnica
1. `src/hooks/useEntityListNavigation.ts`
   - Aceitar um parâmetro opcional `fallbackIds: string[] | undefined` e `basePath` por omissão.
   - Se o `currentId` não estiver no contexto de sessão, usar `fallbackIds`; expor `source: "list" | "all"`.
2. `src/components/contacts/eni/ENIContactDetailWithSidebar.tsx`
   - Já consome `useContacts()`; passar os IDs ordenados por nome como fallback (memoizado).
3. `src/pages/contacts/EditContactPage.tsx`
   - Mesmo fallback, mantendo `buildPath` para o sufixo `/edit`.
4. `src/components/entity/EntityRecordPager.tsx`
   - Tooltip diferenciado quando a ordem é a global ("A percorrer todos os contactos").

Sem alterações de base de dados nem de lógica de negócio.

## Critérios de aceitação
- Abrir um contacto por URL direto ou pesquisa mostra as setas e o contador.
- Vindo da lista filtrada, a ordem e o total continuam a refletir os filtros ativos.
- Setas desativadas no primeiro e último registo.
- Sem erros de consola e funcional em mobile.

## Riscos
- Com muitos contactos, o fallback depende da lista já carregada por `useContacts`; se estiver paginada no servidor, a ordem global limita-se aos registos carregados — validar durante a implementação.
