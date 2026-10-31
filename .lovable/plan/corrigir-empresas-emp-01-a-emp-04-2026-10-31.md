# Corrigir Empresas EMP-01 a EMP-04

## O que muda para o utilizador
- EMP-01: ao editar uma empresa, apagar um campo (site, setor, dimensão, telefone, email, morada, notas, redes sociais) apaga-o de facto.
- EMP-02: a lista de empresas mostra todas, mesmo acima de 1000 (até 10 000), com contagens certas.
- EMP-03: a pesquisa aceita vírgulas e parênteses («Silva, Lda»).
- EMP-04: criar e editar empresa usam o campo de telefone com indicativo, como nos Contactos.

## Detalhes técnicos
- `EditCompanyDialog.tsx` linhas 113-127: `|| undefined` passa a `emptyToNull(...)` (reaproveita `src/lib/contacts/editPayload.ts`); telefone passa a `PhoneInput`.
- `CreateCompanyDialog.tsx` linha ~397: telefone passa a `PhoneInput`.
- `useCompanies.ts` (lista principal) e `useSmartCompanies.ts` (modo sem paginação): leitura em blocos com `fetchAllPaged`, ordem estável com `id`.
- `useSmartCompanies.ts` linha 155: pesquisa via `sanitizeIlikeTerm`; novo `buildCompanySearchOr` (nome, email, setor) em `src/lib/contacts/searchFilter.ts`.
- Testes em `src/test/companies/companies-rules.test.ts`: filtro de pesquisa de empresas com vírgula/parênteses gera 3 condições válidas; termo vazio não filtra; campos vazios ficam `null`.
- Sem alterações na base de dados nem nas permissões.
