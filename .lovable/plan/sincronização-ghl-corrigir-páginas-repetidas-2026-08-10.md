# Sincronização GHL — corrigir "páginas repetidas"

## Diagnóstico

A mensagem vem da própria função de sincronização (`ghl-sync-contacts`): sempre que uma página devolve o mesmo conjunto de contactos que uma anterior, a função pára para não entrar em ciclo infinito. Não é um erro do lado do CRM — é a paginação da API do GHL a repetir-se.

Causa confirmada no código:

- A paginação usa `GET /contacts/` com um cursor que envia **apenas um** parâmetro de cada vez: ou `startAfter`, ou `startAfterId` (ramo `else if` em `buildContactsUrl`, e `resolveNextCursor` devolve sempre só um dos dois).
- A API v1/v2 do GHL para esta rota exige o **par** `startAfter` (data em ms) **+** `startAfterId` para avançar. Com só um deles, devolve repetidamente a mesma página → detector de duplicados dispara e a sincronização é interrompida.
- Existe ainda `seenCursorKeys` declarado mas não utilizado, e o mesmo bloco de paginação está duplicado (modo streaming e modo normal), pelo que qualquer correção tem de ser aplicada nos dois sítios.

## O que vai mudar

1. **Cursor completo**: passar sempre `startAfter` e `startAfterId` em conjunto, derivados de `meta` quando existir e, em fallback, do último contacto da página (`dateAdded` + `id`).
2. **Fallback para pesquisa**: se mesmo assim a página repetir, mudar automaticamente para `POST /contacts/search` com `searchAfter` (paginação estável do GHL) e continuar a sincronização em vez de abortar.
3. **Deduplicação por contacto, não por página**: manter um conjunto de IDs já processados; páginas com sobreposição parcial deixam de ser motivo de paragem — só se para quando uma página não traz nenhum ID novo.
4. **Paragem informativa**: quando for mesmo necessário parar, a mensagem passa a indicar quantos contactos foram sincronizados e que se pode retomar, em vez de aparecer só como aviso genérico.
5. **Guarda anti-ciclo mantida**: limite de páginas, limite de tempo e proteção por cursor repetido (`seenCursorKeys` passa a ser usado) continuam ativos.

## Detalhe técnico

- Ficheiro: `supabase/functions/ghl-sync-contacts/index.ts`
  - `ContactsCursor` passa a `{ startAfter?: number; startAfterId?: string; searchAfter?: unknown[] }`.
  - `buildContactsUrl`: enviar ambos os parâmetros quando disponíveis (deixa de ser `else if`).
  - `resolveNextCursor`: devolver o par completo; usar `meta.startAfter`/`meta.startAfterId` e, em falta, `lastContact.dateAdded` + `lastContact.id`.
  - Novo `fetchContactsSearchPage()` para `POST /contacts/search` (`{ locationId, pageLimit, searchAfter }`), ativado quando o modo GET repete página.
  - Substituir `getContactsPageSignature` como critério de paragem por `seenContactIds: Set<string>`; parar apenas se `novos === 0`.
  - Aplicar exatamente as mesmas alterações nos dois ciclos (streaming e não-streaming) — de preferência extraindo o ciclo para uma função partilhada dentro do ficheiro para evitar divergência futura.
- Redeploy da edge function. Sem alterações de base de dados nem de RLS.
- Frontend (`useGHLContactSync.ts`) não precisa de alterações; continua a mostrar o progresso e o resumo final.

## Critérios de aceitação

- Sincronização do workspace afetado percorre todas as páginas sem a mensagem de "páginas repetidas".
- Contactos já existentes são atualizados e não duplicados.
- Logs mostram o cursor completo (`startAfter` + `startAfterId`) em cada página.
- Em caso de timeout de 50s, a sincronização termina com resumo parcial e pode ser repetida sem perder progresso.

## Riscos

- O fallback `POST /contacts/search` tem formato de resposta ligeiramente diferente (campo `contacts` + `total`); precisa de mapeamento próprio.
- Requer os scopes `contacts.readonly` e `contacts.search` na API Key do GHL; se faltar `contacts.search`, o fallback devolve 401 e mantemos o comportamento atual com mensagem clara.
