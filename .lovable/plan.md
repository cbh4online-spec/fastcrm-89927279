

# Reorganizar Navegação — Compras como Grupo Principal

## Problema

O módulo de Compras (Procurement) está enterrado dentro do grupo "Operações" junto com itens não relacionados (Tarefas, Eventos, Student Journey, Segurança). Compras é um módulo principal de negócio com ~10 sub-páginas e merece o seu próprio grupo de navegação.

## Estrutura Atual (Operações)

```text
Operações
├── Tarefas
├── Eventos
├── Compras (dashboard)
├── Fornecedores
├── Pedidos
├── Ordens de Compra
├── Receções
├── RFQs
├── Dashboard RFQs
├── Quadro Necessidades
├── Import. Preços (hidden)
├── Import. Fornecedores (hidden)
├── Jornada do Aluno
├── Segurança (hidden)
└── Crédito (hidden)
```

## Nova Estrutura

### Novo grupo: **Compras** (order: 7, entre Vendas e Comércio actual)

```text
Compras
├── Dashboard (Compras)
├── Fornecedores
├── Quadro Necessidades
├── Pedidos
├── Ordens de Compra
├── Receções
├── RFQs
├── Dashboard RFQs
├── Import. Preços (search-only)
└── Import. Fornecedores (search-only)
```

### Grupo Operações fica limpo:

```text
Operações
├── Tarefas
├── Eventos
├── Jornada do Aluno
├── Segurança
└── Crédito
```

### Reordenação dos grupos:

| Order | Grupo |
|-------|-------|
| 1 | Início |
| 2 | Estratégia IA |
| 3 | Comercial |
| 4 | Comunicação |
| 5 | Marketing |
| 6 | Vendas |
| 7 | **Compras** ← NOVO |
| 8 | Comércio |
| 9 | Operações |
| 10 | Inteligência |
| 11 | Administração |

## Implementação

**Ficheiro único**: `src/config/routeManifest.ts`

1. Adicionar `"compras"` ao type `NavGroup`
2. Adicionar entrada no array `NAV_GROUPS` com `{ key: "compras", label: "Compras", icon: ShoppingCart, order: 7, collapsible: true }`
3. Ajustar `order` dos grupos seguintes (+1)
4. Mover todas as rotas `procurement-*` de `group: "operacoes"` para `group: "compras"`
5. Fornecedores fica como item principal visível na sidebar (já está)

Alteração puramente de configuração — nenhuma rota, página ou componente muda.

