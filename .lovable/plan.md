

# Reorganizar Comércio — Separar B2B, B2C e C2C

## Problema

O grupo "Comércio" mistura 3 modelos de negócio distintos num único menu:
- **Loja Online (B2C)**: Encomendas, Produtos, Categorias, Cupões, Analíticas
- **Marketplace C2C**: Marketplace peer-to-peer
- **Portal B2B**: Portal, Aprovações, Clientes, Utilizadores, Planos

Isto cria confusão na navegação.

## Solução

Eliminar o grupo genérico "Comércio" e criar **3 grupos independentes**, cada um com o seu ícone e posição na sidebar:

```text
Vendas (order 6)
Compras (order 7)
Loja Online (order 8)    ← B2C — ícone ShoppingBag
Marketplace C2C (order 9) ← C2C — ícone Store
Portal B2B (order 10)     ← B2B — ícone Building2
Operações (order 11)
Inteligência (order 12)
Administração (order 13)
```

### Detalhes por grupo

**Loja Online** (`loja-online`): Encomendas, Produtos, Categorias, Cupões, Analíticas, Definições — module-gated `online-store`

**Marketplace C2C** (`marketplace-c2c`): Marketplace C2C e sub-páginas — module-gated `marketplace-c2c`

**Portal B2B** (`portal-b2b`): Portal, Aprovações, Clientes, Utilizadores, Planos — module-gated `b2b-portal`

## Implementação

**Ficheiro único**: `src/config/routeManifest.ts`

1. Remover `"comercio"` do type `NavGroup`
2. Adicionar `"loja-online"`, `"marketplace-c2c"`, `"portal-b2b"`
3. Criar 3 entradas em `NAV_GROUPS` com ícones distintos
4. Reassignar cada rota ao seu novo grupo
5. Ajustar `order` dos grupos seguintes
6. Atualizar teste `navigation.test.ts` (contagem de grupos: 10 → 12)

