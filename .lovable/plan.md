

# Plano: Expandir PlansSection com Módulos Marketplace, Créditos e Packs (conforme brochura)

## Diagnóstico

A brochura comercial define uma estrutura completa de pricing que não está reflectida na BD nem na interface admin:

1. **Módulos marketplace** — A brochura lista ~30 módulos com preços específicos (Account Brief 79€, AI Assistants 49€+créditos, Helpdesk 59€, etc.), mas na BD quase todos têm `price_eur: 0.00` e `pricing_model: free`.
2. **Packs/Bundles** — A brochura define 6 packs (B2B Revenue 129€, Finance 19€, Commerce 79€, etc.) mas a tabela `module_bundles` está vazia.
3. **Créditos IA** — A brochura define 4 packs (100 créditos 9€, 300 créditos 24€, 1000 créditos 69€, 3000 créditos 179€) mas a BD tem valores diferentes (50 créditos 4.99€, 200 créditos 14.99€, 500 créditos 29.99€).
4. **Planos base** — A brochura usa START/GROW/PRO (79€/179€/349€) com utilizadores incluídos e créditos IA, mas a BD usa free/basic/pro/agency.

Já existe um `PricingManagementSection` separado no super admin, mas o utilizador quer poder gerir tudo de forma integrada a partir do menu Planos.

## Alterações

### 1. Atualizar dados na BD (via insert tool)

Atualizar `marketplace_modules` com os preços da brochura:
- Account Brief → 79€/monthly
- Lead Enricher → 39€/monthly
- Prospecção Profissional → 59€/monthly
- SEO & Growth → 39€/monthly
- Email Marketing Pro → 9€/monthly
- Instagram Looter → 39€/monthly
- Meta → 19€/monthly
- Bio OS → 9€/monthly
- Proposals Pack → 19€/monthly
- AI Assistants → 49€/monthly
- AI Sales Coach → 29€/monthly
- AI Copilot → 49€/monthly
- AI Suggestions → 19€/monthly
- AI Profiles → 29€/monthly
- Conversational Engine → 59€/monthly
- Knowledge Base AI → 39€/monthly
- AI Document OCR → 49€/monthly
- IMO AI → 39€/monthly
- Loja Online → 49€/monthly
- Portal B2B → 79€/monthly
- Marketplace C2C → 99€/monthly
- Purchase & Procurement → 79€/monthly
- Helpdesk → 59€/monthly
- Recursos Humanos → 69€/monthly

Inserir bundles na tabela `module_bundles`:
- B2B Revenue Pack 129€
- Finance Pack 19€
- Proposals Pack 19€
- Education Pack 49€
- Commerce Pack 79€
- Advanced Intelligence 99€

Atualizar `credit_packages` com valores da brochura:
- 100 créditos 9€
- 300 créditos 24€
- 1.000 créditos 69€
- 3.000 créditos 179€

### 2. Expandir PlansSection com tabs adicionais

Adicionar ao `PlansSection.tsx` 3 novas tabs após o conteúdo existente:

**Tab "Módulos Marketplace":**
- Tabela com todos os módulos agrupados por categoria (Comercial, Marketing, IA, Commerce, Operações)
- Colunas: Nome, Categoria, Preço, Modelo de pricing, Plano mínimo, Status
- Edição inline de preço, pricing_model e min_plan
- Botão para adicionar novo módulo

**Tab "Packs & Bundles":**
- Cards dos bundles com módulos incluídos, preço original vs bundle, desconto
- CRUD de bundles

**Tab "Créditos IA":**
- Tabela de credit packages com nome, créditos, preço, desconto
- Edição inline
- Tabela de referência de consumo por operação (informativa, hardcoded da brochura)

### 3. Ficheiros

**`src/components/super-admin/PlansSection.tsx`** — Adicionar Tabs wrapper ao nível do topo com:
- Tab "Planos" (conteúdo actual)
- Tab "Módulos" (nova)
- Tab "Packs" (nova)
- Tab "Créditos IA" (nova)

Extrair sub-componentes para manter o ficheiro gerível:
- `PlansFeaturesTab.tsx` — conteúdo actual do PlansSection
- `MarketplaceModulesTab.tsx` — gestão de módulos com preços da brochura
- `BundlesTab.tsx` — gestão de packs/bundles
- `CreditsTab.tsx` — gestão de credit packages + tabela de consumo

### 4. Hooks necessários

O hook `useMarketplaceModulesAdmin` já existe. Verificar se cobre update de preços. Criar hooks adicionais se necessário para bundles e credit packages.

## Secção técnica

- Updates de dados via insert tool (UPDATE statements) para preços dos módulos, bundles e credit packages
- Novas queries no frontend para `module_bundles` e `credit_packages`
- Mutations de update usam `.eq("id", row.id)` para cada módulo/bundle/package
- RLS: tabelas de configuração acessíveis apenas a super admin (verificar políticas existentes)
- Tipo de dados: `price_eur` é numeric, `pricing_model` é text, `min_plan` é text

## Critérios de aceitação

- Todos os preços da brochura reflectidos na BD
- Módulos editáveis com preço, modelo e plano mínimo
- Bundles CRUD funcional
- Credit packages editáveis com valores da brochura
- Tabela de consumo de referência visível
- Build sem erros
- Interface organizada por tabs dentro de Planos

