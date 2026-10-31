# Corrigir Contactos CT-01 a CT-04

## O que muda para o utilizador
- CT-01: ao editar um contacto, apagar um campo (email, telefone, empresa, cargo, notas, redes sociais) passa a apagá-lo de facto.
- CT-02: a lista de contactos mostra todos os contactos, mesmo acima de 1000, e as contagens ficam certas.
- CT-03: a pesquisa aceita vírgulas e parênteses («Silva, Lda») sem erro.
- CT-04: editar um contacto usa o mesmo campo de telefone com indicativo que a criação.

## Detalhes técnicos
- `EditContactDialog.tsx` linhas 92-104: `|| undefined` passa a `|| null`; o telefone passa a usar `PhoneInput`, como em `CreateContactDialog`.
- Novo `src/lib/contacts/fetchAllPaged.ts`: lê em blocos de 1000 com `.range()` até esgotar (máximo 10 000); usado em `useSmartContacts` (modo sem paginação) e em `useContacts`.
- Novo `src/lib/contacts/searchFilter.ts`: escapa o texto da pesquisa (remove `,()` e escapa `%`/`_`) antes de o pôr em `.or(...ilike...)`; usado em `useSmartContacts` (search e company).
- Testes em `src/test/contacts/`: campos vazios ficam `null`; leitura por blocos junta mais de 1000 linhas e pára no fim; a pesquisa com vírgula/parênteses gera um filtro válido.
- Sem alterações na base de dados nem nas permissões.
