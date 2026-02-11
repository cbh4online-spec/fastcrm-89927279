

# Adicionar 3 Novos Modulos ao Marketplace

## Modulos a Criar

Adicionar ao array `SAMPLE_MODULES` em `src/types/marketplace.ts` tres novos modulos:

### 1. Loja Online (E-Commerce)
- **id/slug**: `online-store`
- **Categoria**: `sales`
- **Icon**: `ShoppingBag`
- **Tagline**: "A sua loja online integrada no CRM"
- **Descricao**: Venda produtos e servicos com loja publica, carrinho de compras, checkout Stripe e gestao de encomendas -- tudo sem sair do CRM.
- **Pricing**: fixed_monthly, 49 EUR, trial 14 dias
- **internal_type**: `native_feature`
- **is_featured**: true, **is_new**: true

### 2. Marketplace C2C
- **id/slug**: `marketplace-c2c`
- **Categoria**: `sales`
- **Icon**: `Store`
- **Tagline**: "Marketplace entre membros da sua comunidade"
- **Descricao**: Permita que os membros comprem e vendam entre si. Anuncios com moderacao automatica, chat direto, comissoes configuráveis e sistema de reputacao integrado.
- **Pricing**: fixed_monthly, 79 EUR, trial 14 dias
- **internal_type**: `native_feature`
- **is_featured**: true, **is_new**: true

### 3. FastClub (Comunidade)
- **id/slug**: `fastclub`
- **Categoria**: `communication`
- **Icon**: `Users`
- **Tagline**: "Comunidade privada para os seus clientes"
- **Descricao**: Crie uma comunidade exclusiva com forum de discussao, eventos, canais tematicos e gate de acesso com aprovacao. Ideal para fidelizacao e networking.
- **Pricing**: fixed_monthly, 59 EUR, trial 14 dias
- **internal_type**: `native_feature`
- **is_featured**: true, **is_new**: true

## Ficheiro a Alterar

| Ficheiro | Alteracao |
|---|---|
| `src/types/marketplace.ts` | Adicionar 3 objetos `MarketplaceModule` ao final do array `SAMPLE_MODULES` |

## Detalhes de Cada Modulo

Cada modulo seguira o padrao exacto dos existentes, com:
- Permissoes adequadas (data_permissions, workspace_isolation)
- Casos de uso e resultados esperados relevantes
- Publico-alvo especifico
- Datas de criacao actuais (2025-02)

Nenhuma alteracao na base de dados e necessaria -- os modulos sao definidos estaticamente no codigo.
