

# Migrar Marketplace para Base de Dados

## Problema
A página Marketplace usa `SAMPLE_MODULES` — um array hardcoded com 27 módulos. A base de dados tem 30 módulos (faltam `seo-growth`, `proposals`, `invoices` no código). Qualquer módulo novo adicionado à DB não aparece porque a página nunca consulta a DB.

## Solução
Substituir `SAMPLE_MODULES` por dados da DB no `Marketplace.tsx`, mantendo compatibilidade com os componentes existentes (`ModuleCard`, `ModuleDetailSheet`, etc.).

## Alterações

### 1. Actualizar `useMarketplaceModules` hook
- Expandir a query para incluir todos os campos necessários: `target_audience`, `expected_results`, `use_cases`, `internal_type`, `permissions`, `embedded_config`, `publisher`, `reviews_count`
- Mapear o resultado da DB para o tipo `MarketplaceModule` existente, fazendo cast dos campos JSONB (`pricing`, `permissions`, `expected_results`, etc.)

### 2. Refactorizar `Marketplace.tsx`
- Substituir todas as referências a `SAMPLE_MODULES` por `modules` retornado do hook `useMarketplaceModules`
- Adicionar estado de loading enquanto carrega da DB
- Manter toda a lógica de filtros, tabs e pesquisa existente

### 3. Refactorizar `MarketplaceAdmin.tsx`
- Substituir `SAMPLE_MODULES` pelo mesmo hook de DB

### 4. Refactorizar `InstalledModules.tsx`
- Substituir lookup de `SAMPLE_MODULES.find()` por dados vindos da DB (receber módulo como prop ou usar hook)

### 5. Manter `SAMPLE_MODULES` como fallback
- Não apagar o array — mantê-lo como seed/referência mas remover a dependência directa nas páginas

## Detalhes técnicos
- O tipo `MarketplaceModule` continua a ser o contrato dos componentes — a transformação DB→tipo acontece no hook
- Campos JSONB (`pricing`, `permissions`, `expected_results`, `use_cases`, `embedded_config`) são cast no hook com defaults seguros
- A query traz `SELECT *` ou campos explícitos da tabela `marketplace_modules`
- Ficheiros alterados: `useMarketplaceModules.ts`, `Marketplace.tsx`, `MarketplaceAdmin.tsx`, `InstalledModules.tsx`

