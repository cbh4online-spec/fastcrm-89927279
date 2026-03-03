

## Relacionar Pricing & Módulos com o Marketplace Real

### Problema

O tab "Módulos" no Pricing Management cria registos genéricos em `platform_pricing_config` desligados dos módulos reais da tabela `marketplace_modules`. O utilizador quer:
1. Ver os módulos reais do marketplace neste painel
2. Editar preços que afetem tanto a landing page como o marketplace

### Plano

#### 1. Refazer o tab "Módulos" para ler de `marketplace_modules`

Em vez de filtrar `platform_pricing_config` por `config_type = "module"`, o tab vai:
- Buscar todos os módulos de `marketplace_modules` (id, name, slug, icon, category, pricing, status, tagline, is_featured)
- Renderizar cards editáveis com nome, categoria, preço base (do campo JSONB `pricing`), status e tagline
- Permitir editar `pricing.base_price`, `pricing.trial_days`, `status`, `is_featured`, `tagline` diretamente
- Guardar alterações via `supabase.from("marketplace_modules").update(...)` 

#### 2. Criar hook `useMarketplaceModulesAdmin`

Ficheiro: `src/hooks/useMarketplaceModulesAdmin.ts`
- Query: busca todos os módulos de `marketplace_modules` ordenados por nome
- Mutation: atualiza campos editáveis (pricing, status, is_featured, tagline, name, description)
- Invalidação automática da cache

#### 3. Refazer a secção de módulos no `PricingManagementSection`

Substituir a secção de módulos (linhas 283-325) por:
- Cards com ícone, nome, categoria, status badge
- Campos editáveis inline: preço mensal (`pricing.base_price`), dias de trial, status (active/inactive)
- Toggle `is_featured`
- Botão para sincronizar preços com `platform_pricing_config` (para a landing page usar os mesmos valores)
- Botão "Sincronizar para Landing Page" que cria/atualiza registos em `platform_pricing_config` com `config_type: "module"` e `config_key` = slug do módulo

#### 4. Adicionar tab ou secção "Landing Page" nos Bundles

Os bundles da landing page (já definidos em `ONBOARDING_BUNDLES` e `EXTENSION_PACKS`) ficam editáveis:
- Os bundles existentes em `platform_pricing_config` com `config_type = "bundle"` já funcionam
- Adicionar botão "Importar do Marketplace" que cria bundles a partir dos `EXTENSION_PACKS` com preços reais

### Ficheiros a criar/editar

| Ficheiro | Ação |
|---|---|
| `src/hooks/useMarketplaceModulesAdmin.ts` | Criar: CRUD hook para marketplace_modules |
| `src/components/super-admin/PricingManagementSection.tsx` | Editar: refazer tab Módulos para ler de marketplace_modules, adicionar sync landing page |

### Resultado

- Tab "Módulos" mostra módulos reais do marketplace com preços editáveis
- Alterações de preço refletem no marketplace imediatamente
- Botão de sincronização propaga preços para a landing page via `platform_pricing_config`
- Gestão centralizada num único painel

