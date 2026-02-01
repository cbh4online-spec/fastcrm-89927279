
# Plano: Restaurar Valores de Faturação (Histórico Comercial)

## Problema Identificado

A secção de "Histórico Comercial" que mostra vendas do ano atual e dos últimos 3 anos **existe no código** para contactos, mas:

1. **Menu lateral não inclui a opção `history`** - O `EntitySidebarMenu.tsx` não tem a entrada para aceder à secção de histórico comercial
2. **Empresas não têm componente equivalente** - Não existe uma `CommercialHistorySection` para empresas
3. **Tabela de empresas não tem campos de vendas por ano** - A base de dados `companies` só tem `annual_revenue`, não tem `sales_2023`, `sales_2024`, etc.

## Solução

### Parte 1: Adicionar Secção ao Menu Lateral

Modificar `src/components/entity/EntitySidebarMenu.tsx` para incluir a opção "Histórico Comercial":

```text
Na secção NEGÓCIO, adicionar:
{ id: 'history', label: 'Histórico Comercial', icon: TrendingUp, showFor: ['contact', 'company'] }
```

### Parte 2: Criar Secção de Histórico para Empresas

Criar `src/components/companies/sections/CommercialHistorySection.tsx` similar à versão de contactos, mas adaptada para empresas:
- Calcular vendas por ano a partir das faturas associadas à empresa
- Usar os campos de revenue existentes (`annual_revenue`, etc.)
- Mostrar categoria ABC calculada automaticamente

### Parte 3: Base de Dados - Adicionar Campos de Vendas por Ano

Adicionar colunas à tabela `companies`:
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sales_2023 NUMERIC;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sales_2024 NUMERIC;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sales_2025 NUMERIC;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sales_2026 NUMERIC;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_revenue NUMERIC DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS average_ticket NUMERIC;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS abc_category TEXT;
```

### Parte 4: Integrar na Página de Detalhe de Empresa

Modificar `src/components/companies/CompanyDetailWithSidebar.tsx`:
- Importar o novo `CommercialHistorySection`
- Adicionar case `'history'` no switch de `renderSectionContent`

### Parte 5: Atualizar Tipos e Hooks

Atualizar `src/hooks/useCompanies.ts`:
- Adicionar novos campos ao tipo `Company`
- Adicionar novos campos ao `updateCompany`

## Ficheiros a Modificar/Criar

| Ficheiro | Ação |
|----------|------|
| `src/components/entity/EntitySidebarMenu.tsx` | Modificar - adicionar opção 'history' |
| `src/components/companies/sections/CommercialHistorySection.tsx` | **Criar** |
| `src/components/companies/CompanyDetailWithSidebar.tsx` | Modificar - adicionar case 'history' |
| `src/hooks/useCompanies.ts` | Modificar - adicionar campos de vendas |
| Migração SQL | Adicionar colunas de vendas por ano |

## Resultado Esperado

Após implementação:
- Menu lateral terá opção "Histórico Comercial" para contactos E empresas
- Contactos continuarão a usar a `CommercialHistorySection` existente
- Empresas terão nova secção equivalente mostrando:
  - Vendas 2026, 2025, 2024, 2023
  - Receita Total (calculada automaticamente)
  - Ticket Médio
  - Última Compra
  - Categoria ABC (A/B/C)
