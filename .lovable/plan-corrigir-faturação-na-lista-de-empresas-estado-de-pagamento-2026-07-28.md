# Corrigir faturação na lista de Empresas (+ estado de pagamento)

## Diagnóstico (verificado)

- A lista `/dashboard/companies` mostra `Faturação total`, `Vendas 2026/2025/2024` a partir das **colunas estáticas** da tabela `companies` (`total_revenue`, `sales_2024/25/26`), lidas em `useCompanies` com `select("*")`.
- Na base de dados do workspace PHARLISS: **504 empresas, 0 com `total_revenue` > 0**, apenas 2 com `sales_2026` e 1 com `sales_2025`. Ou seja, estas colunas nunca são preenchidas — daí os `0,00 €`.
- O detalhe da empresa mostra valores certos porque usa `useCompanyAggregatedInvoices`, que agrega faturas ligadas à empresa **e** às faturas ligadas apenas a contactos dessa empresa.
- Isto é essencial: das 5.947 faturas do workspace, **4.008 não têm `company_id`** (só `contact_id`). Uma agregação simples por `company_id` continuaria a mostrar zeros na maioria.
- Estados existentes em `invoices`: `sent`, `partially_paid`, `paid`, `cancelled`, `draft` — logo é possível derivar pago/pendente/vencido.

## O que vai ser feito

1. **Função de agregação no backend** (`get_companies_financials(_workspace_id uuid)`, SECURITY INVOKER, `search_path = public`), que devolve por empresa:
   - `net_total` (soma de `subtotal` — sempre s/IVA, conforme convenção do projeto)
   - `gross_total` (soma de `total`, c/IVA)
   - `paid_total` (soma de `amount_paid`)
   - `pending_total` (`gross - amount_paid` das faturas não liquidadas)
   - `overdue_total` (pendente com `due_date` no passado)
   - `sales_2024`, `sales_2025`, `sales_2026` (líquido por ano de `issue_date`)
   - `last_invoice_date`, `invoice_count`
   - Regras iguais ao detalhe: exclui `cancelled`, `draft`, `refunded`, `void`; inclui faturas ligadas por `company_id` **ou** via `contacts.company_id`.
   - Escopo por workspace + RLS do utilizador (invoker), sem qualquer bypass.

2. **Hook `useCompaniesFinancials`** — uma chamada por workspace, com cache React Query, devolvendo um `Map<company_id, financials>`.

3. **Lista de Empresas (`CompaniesListIX.tsx`)**
   - As colunas de faturação passam a ler do mapa agregado (fallback para os campos da tabela se não houver dados).
   - Novas colunas opcionais: **Pago**, **Pendente**, **Vencido**, **Nº faturas**, **Última fatura**.
   - Badge de estado de pagamento por empresa: `Liquidado` / `Parcial` / `Em dívida` / `Vencido`.
   - Ordenação por faturação passa a usar o valor real agregado.
   - Estados de loading (skeleton nas células) e erro tratado sem partir a lista.

## Notas técnicas

- Os valores continuam apresentados **s/IVA** nas colunas de faturação, como já corrigido anteriormente; Pago/Pendente usam base bruta (`total − amount_paid`), coerente com o diálogo de faturas do detalhe.
- A agregação é feita em SQL para evitar o limite de 1000 linhas do PostgREST e não trazer ~6.000 faturas para o browser.
- Não são alteradas as colunas `companies.total_revenue`/`sales_*` (ficam como estão, apenas deixam de ser a fonte de verdade na lista).

## Critérios de aceitação

- Empresa "2004 Cabeleireiros Unisexo Lda" mostra na lista o mesmo total do detalhe.
- Empresas com faturas apenas via contactos deixam de mostrar 0,00 €.
- Colunas Pago/Pendente/Vencido coerentes com o diálogo de faturas.
- Ordenação por faturação ordena pelos valores reais.
- Sem erros na consola; lista continua fluida com 504 empresas.

## Riscos

- Se existirem faturas duplicadas por contacto + empresa, a deduplicação é feita por `invoice.id` na função (igual ao detalhe).
- Empresas sem contactos associados continuam dependentes de `company_id` correto nas faturas.
