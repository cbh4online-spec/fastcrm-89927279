## Diagnóstico

O botão existe: em `src/components/layout/WorkspaceSwitcher.tsx` o dropdown termina com um `DropdownMenuItem` "Create workspace" (com ícone `Plus`), ligado a `createWorkspace` do `WorkspaceContext`.

O problema é de layout, não de permissões: o `DropdownMenuContent` não define altura máxima nem scroll. Com a quantidade de workspaces desta conta (secção "Meus Workspaces" + secção "Clientes (Gestão)", visível no screenshot com mais de uma dezena de entradas), a lista ultrapassa a altura do ecrã e o item de criação fica empurrado para fora da área visível — nunca é alcançável.

## Alterações

`src/components/layout/WorkspaceSwitcher.tsx`:

1. Estruturar o conteúdo do dropdown em três zonas:
   - Zona de lista com scroll próprio (`max-h-[50vh] overflow-y-auto`), contendo "Meus Workspaces" e "Clientes (Gestão)".
   - Rodapé fixo (fora da zona scrollável) com o separador e a ação de criar workspace, sempre visível.
   - Limitar também a altura total do `DropdownMenuContent` para nunca exceder o viewport.
2. Adicionar um campo de pesquisa rápida no topo do dropdown (filtro por nome), útil dado o número de workspaces — filtra ambas as secções em simultâneo e mostra estado vazio quando não há resultados.
3. Traduzir para português de Portugal os textos ainda em inglês deste componente: "Create workspace" → "Criar workspace", "Select workspace" → "Selecionar workspace", "No role" → "Sem função", título/descrição do diálogo, labels e botões, e as mensagens de toast ("Workspace criado!" / "Erro ao criar workspace").

Nada muda na lógica de criação, permissões ou base de dados.

## Critérios de aceitação

- Com muitos workspaces, o botão "Criar workspace" está sempre visível no fundo do dropdown, sem necessidade de scroll da página.
- A lista de workspaces faz scroll interno e o rodapé mantém-se fixo.
- A pesquisa filtra as duas secções e o item selecionado continua marcado com o visto.
- Criar um workspace continua a funcionar e o novo workspace passa a ficar disponível na lista.
- Sem erros de consola; funciona em desktop e mobile, e no estado colapsado da sidebar.

## Riscos

- Nenhum risco funcional relevante; a mudança é de apresentação. A verificar apenas que o scroll interno não entra em conflito com o fecho do dropdown ao clicar fora.
