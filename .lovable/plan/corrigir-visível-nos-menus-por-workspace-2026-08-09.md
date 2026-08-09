# Corrigir "Visível" nos Menus por Workspace

## Diagnóstico

Confirmado no código: quando escolhe **Visível** num item, o sistema **apaga** a regra desse item em vez de a gravar (`useWorkspaceMenuOverrides.ts`, mutações `setVisibility` e `setBulk`: `if (visibility === "visible") → delete`).

Sem regra própria, o item volta a **herdar** do nível acima. No seu caso o grupo *Definições* está **Oculto**, portanto todas as páginas herdam "Oculto" — e a seleção parece não fazer nada.

Ou seja: hoje é impossível ter uma página visível dentro de um grupo oculto.

## O que vai mudar

1. **"Visível" passa a ser uma regra explícita**, gravada na base de dados como qualquer outro estado. A herança já sabe respeitar regras próprias, por isso uma página marcada como Visível deixa de ser afetada pelo grupo oculto.
2. **Nova opção "Herdar (predefinido)"** no seletor, que apaga a regra e devolve o item ao comportamento herdado — o que "Visível" fazia por engano.
3. **Feedback visível**: confirmação (toast) também nas alterações individuais, hoje só existe no "Aplicar a tudo"; e o badge "herdado" deixa de aparecer quando o item tem regra própria.
4. **Coerência do "Aplicar a tudo"**: passa a gravar o estado escolhido em todos os descendentes, incluindo Visível.

## Notas técnicas

- `src/hooks/useWorkspaceMenuOverrides.ts`: remover o ramo de `delete` para `visible` (passa a upsert normal); adicionar mutação `clearOverride` para a opção "Herdar"; `setBulk` deixa de separar deletes.
- `src/components/super-admin/WorkspaceMenusSection.tsx`: acrescentar a entrada "Herdar (predefinido)" ao `VisibilitySelect` (valor sentinela `inherit`), calcular `inherited` via `getOverride(...) === undefined` para grupos, sub-grupos e rotas, e ligar a nova mutação.
- Sem alterações de base de dados: a tabela `workspace_menu_overrides` e o `check` de `visibility` já aceitam `visible`.
- Resolução em `src/config/menuOverrides.ts` mantém-se inalterada (já dá prioridade a regra própria).

## Critérios de aceitação

- Com o grupo *Definições* Oculto, marcar uma página como **Visível** mantém-na visível na sidebar e na pesquisa (⌘K).
- Escolher **Herdar** remove a regra e o badge "herdado" reaparece.
- Cada alteração mostra confirmação e o estado persiste após recarregar a página.
