# Corrigir "Failed to save view" ao criar nova vista no Pipeline

## Diagnóstico (confirmado)

- O diálogo `CreateViewDialog` envia `view_mode` com os valores `"kanban"` ou `"list"`.
- Na base de dados, `crm_saved_views.view_mode` é do tipo enum `crm_view_mode`, que só aceita **`table`** e **`board`**.
- O insert falha com erro de enum inválido e o hook `useCreateSavedView` mostra sempre o toast genérico `Failed to save view`, sem detalhe do erro.
- Problemas secundários no mesmo diálogo: o campo do nome usa a etiqueta `dealName` ("Nome do Negócio") e o seletor usa `kanbanView` ("Vista Kanban") como etiqueta em vez de "Tipo de vista"; as mensagens estão em inglês.

## O que vai mudar

1. **Valores corretos de `view_mode`** — o seletor passa a gravar `board` (apresentado como "Kanban") e `table` (apresentado como "Lista"), alinhados com o enum da base de dados e com o resto do CRM (`UnifiedCrmView` já usa `table`/`board`).
2. **Mensagens de erro úteis** — `useSavedViews` passa a mostrar a mensagem real devolvida pelo backend (ex.: falha de permissões vs. valor inválido), em português, em vez de "Failed to save view". O mesmo para eliminar/atualizar/duplicar.
3. **Etiquetas corretas no diálogo** — "Nome da vista" e "Tipo de vista", com opções "Kanban" e "Lista"; textos traduzidos em pt.
4. **Validação** — impedir submissão com nome vazio (já existe) e mostrar estado de erro inline caso a gravação falhe, mantendo o diálogo aberto.

## Notas técnicas

- `src/components/opportunities/CreateViewDialog.tsx`: estado inicial `"board"`, `SelectItem` com `value="board"` e `value="table"`, etiquetas corrigidas.
- `src/hooks/useSavedViews.ts`: tipar `view_mode` como `"table" | "board"` e propagar `error.message` nos `onError`.
- `src/i18n/locales/pt/crm.json`: chaves novas para "Nome da vista" / "Tipo de vista" / "Lista".
- Sem alterações de base de dados (o enum atual é suficiente).

## Critérios de aceitação

- Criar uma vista "myMIA" do tipo Kanban grava com sucesso e a vista fica selecionada.
- Criar uma vista do tipo Lista grava com sucesso.
- Um erro real (ex.: sem permissões) mostra a mensagem específica e não fecha o diálogo.
- Sem erros de consola.
