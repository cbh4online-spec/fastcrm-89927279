

# Fix: Auto-preencher Dados de Faturação do Cliente Selecionado

## Problema
Os campos de faturação (Nome, NIF, Morada) são inputs manuais separados do seletor de cliente. Deviam ser automaticamente preenchidos quando se seleciona um contacto ou empresa acima.

## Solução

### `ProposalClientSection.tsx`
1. **Remover os inputs manuais** de Nome, NIF e Morada da secção "Dados de Faturação"
2. **Mostrar os dados como campos read-only** (preenchidos automaticamente) após selecionar o cliente, com indicação visual de que vêm do cliente selecionado
3. **Manter editáveis** com um botão/toggle "Editar" caso o utilizador precise alterar algo manualmente
4. O `handleClientSelect` já preenche `billingName`, `billingNif` e `billingAddress` — apenas precisa de garantir que funciona corretamente

### `ClientSearchSelect.tsx`
- Para **contactos**, o campo `address` não existe na tabela — adicionar mapeamento do endereço a partir da empresa associada (`company_id`) se disponível, ou deixar vazio

### Fluxo
1. Utilizador seleciona tipo de cliente (Contacto/Empresa)
2. Utilizador pesquisa e seleciona o cliente
3. Secção "Dados de Faturação" é automaticamente preenchida com nome, NIF e morada do cliente
4. Campos mostram dados preenchidos mas continuam editáveis para ajustes
5. Se limpar a seleção do cliente, os campos de faturação são limpos também

### Alterações visuais
- Secção de faturação mostra um estado vazio ("Selecione um cliente acima") quando nenhum cliente está selecionado
- Quando preenchido, mostra os dados com indicação de origem (ex: ícone de link)

