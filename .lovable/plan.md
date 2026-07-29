# Setas anterior/seguinte em Contactos, Leads e Empresas

## Diagnóstico
- O componente `EntityRecordPager` e o hook `useEntityListNavigation` já existem e estão ligados apenas à ficha de Contacto (`ENIContactDetailWithSidebar`) e ao formulário de edição de contacto.
- Leads (`LeadDetailWithSidebar`) e Empresas (`CompanyDetailWithSidebar`) não têm qualquer integração: nem gravam o contexto ao clicar numa linha da lista, nem mostram o controlo no cabeçalho.
- Nas listas de Leads e Empresas (`LeadsListIX`, `CompaniesListIX`) o clique na linha faz apenas `navigate(...)`, sem gravar a ordem dos registos.
- No caso dos Contactos, o controlo está montado mas não aparece no ecrã do utilizador. A causa exata ainda não está confirmada (fallback vazio, contacto fora da lista carregada, ou o pager a ser cortado pelo layout do cabeçalho). O primeiro passo da implementação é confirmar isso em execução antes de alterar código.

## Comportamento pretendido
- Nas três entidades, o cabeçalho da ficha mostra `‹ Registo X de Y ›`.
- Vindo da lista, a ordem respeita pesquisa, filtros e ordenação ativos; a paginação não limita a navegação.
- Sem contexto de lista (link direto, pesquisa global, recarregamento), fallback para a lista completa da entidade ordenada por nome.
- Atalhos `Alt + ←` / `Alt + →`, setas desativadas nos extremos, contador abreviado em mobile.
- Se a entidade tiver menos de dois registos, o controlo não aparece.

## Plano de implementação
1. **Confirmar o caso dos Contactos**
   - Verificar em execução, na ficha atual, se `hasContext` é falso (fallback sem IDs / contacto ausente) ou se é um problema visual de layout, e corrigir apenas a causa confirmada.

2. **Leads**
   - `src/components/leads/LeadsListIX.tsx`: ao clicar numa linha, gravar o contexto (`saveEntityListNavigation("lead", idsFiltradosOrdenados, "/dashboard/leads")`) antes de navegar.
   - `src/components/crm/LeadDetailWithSidebar.tsx`: usar `useEntityListNavigation("lead", id, undefined, { fallbackIds, fallbackBasePath: "/dashboard/leads" })` com os IDs de leads do workspace ordenados por nome, e inserir `<EntityRecordPager label="Lead" />` junto ao botão "Voltar" do cabeçalho.

3. **Empresas**
   - `src/components/companies/CompaniesListIX.tsx`: gravar contexto com a entidade `"company"` e base `/dashboard/companies`.
   - `src/components/companies/CompanyDetailWithSidebar.tsx`: mesmo padrão, com `<EntityRecordPager label="Empresa" />` no cabeçalho.

4. **Ajustes ao componente partilhado**
   - `EntityRecordPager`: plural correto em PT para "Empresa" (evitar "Empresas" gerado por sufixo "s" incorreto noutras etiquetas) — passar plural opcional por prop.

Sem alterações de base de dados nem de lógica de negócio.

## Critérios de aceitação
- Abrir um contacto, lead ou empresa a partir da respetiva lista mostra `X de Y` coerente com filtros e ordenação.
- As setas continuam visíveis ao abrir por URL direto ou pesquisa (ordem alfabética global).
- Setas desativadas no primeiro e último registo, com tooltip.
- Atalhos de teclado funcionam fora de campos de texto.
- Sem erros de consola; funcional em mobile.

## Riscos
- As listas de Leads e Empresas são paginadas no cliente/servidor; se a lista de fallback só carregar a página atual, a navegação global fica limitada a esses registos — validar durante a implementação e, se necessário, carregar apenas `id, name` para o fallback.
