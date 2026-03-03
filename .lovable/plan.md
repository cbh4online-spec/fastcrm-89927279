

# Adicionar Projeto/Proposta e Data Limite ao RFQ

## Problema
O formulário de criação de RFQ e a página de detalhe não permitem:
1. Referir o número da proposta associada ao projeto
2. Definir a data limite de resposta (due_date)
3. Editar estes campos na página de detalhe

## Alterações

### 1. Modal de Criação de RFQ (`ProcurementProjectDetailPage.tsx`)
- Adicionar campo **"Data Limite de Resposta"** com datepicker
- Passar `due_date` ao `useCreateRFQFromNeeds`
- Mostrar o nome do projeto e número da proposta de origem (vem de `procurement_projects.source_id` + `source_type`)

### 2. Página de Detalhe RFQ (`RFQDetailPage.tsx`)
- No header enterprise, mostrar **Projeto** (nome do projeto associado via `project_id`) e **Proposta** (source_id do projeto, se `source_type = 'proposal'`)
- Mostrar a **Data Limite** de forma mais destacada (já existe `rfq.due_date` mas está discreto)
- Permitir **editar inline** os campos `due_date`, `payment_terms`, `delivery_location`, `incoterm`, `currency`, `quote_validity_days` quando o RFQ está em estado `draft`

### 3. Hook `useRFQ.ts`
- No `useRFQDetail`, expandir a query do RFQ para incluir dados do projeto de compras: `procurement_projects:project_id(name, source_id, source_type)`
- Adicionar mutation `useUpdateRFQ` para edição inline dos campos enterprise

### 4. Necessidades Board (`ProcurementNeedsBoardPage.tsx`)
- Verificar se o fluxo de criação de RFQ a partir do board também passa `due_date` — adicionar campo se necessário

### Resumo de ficheiros alterados
- `src/pages/procurement/ProcurementProjectDetailPage.tsx` — datepicker no modal
- `src/pages/procurement/RFQDetailPage.tsx` — mostrar projeto/proposta, edição inline
- `src/hooks/useRFQ.ts` — expandir query + nova mutation
- `src/hooks/useProcurementNeeds.ts` — verificar passagem de due_date no createRFQ

