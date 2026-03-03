

# Diagnóstico: Dois menus "Vendas" duplicados

## Problema

Na sidebar V2 (`nav.v2.ts`), os itens de vendas estão divididos em dois locais:

1. **NAV_V2_CORE** (itens top-level, sempre visíveis):
   - Pipeline (`/dashboard/revenue`)
   - Oportunidades (`/dashboard/opportunities`)

2. **NAV_V2_GROUPS** — grupo "Vendas" (colapsável):
   - Propostas (moduleSlug: `proposals`)
   - Faturas (moduleSlug: `invoices`)

Na sidebar V1 (`nav.v1.ts`), "Notas de Encomenda" aparece duplicada:
- No grupo **"Vendas"** (linha 112): `/dashboard/order-notes`
- No grupo **"Portal B2B"** (linha 129): `/dashboard/order-notes` (mesmo href)

## Solução Proposta

### 1. Unificar o grupo "Vendas" na V2

Mover Propostas e Faturas para os itens core (junto com Pipeline e Oportunidades), **eliminando o grupo colapsável "Vendas"** que só tem 2 itens. Ou, alternativamente, mover Pipeline e Oportunidades para dentro do grupo "Vendas" para que tudo fique num só lugar.

**Abordagem recomendada**: Consolidar tudo no grupo "Vendas" colapsável, removendo Pipeline/Oportunidades dos core items e adicionando-os ao grupo:

```
Vendas (grupo colapsável):
  - Pipeline
  - Oportunidades  
  - Propostas
  - Faturas
  - Notas de Encomenda
```

### 2. Remover duplicação de "Notas de Encomenda" na V1

Na V1, remover "Notas de Encomenda" do grupo "Vendas" (já está no "Portal B2B") — ou vice-versa, dependendo da preferência.

### Ficheiros a editar
- `src/config/nav.v2.ts` — consolidar itens de vendas num único local
- `src/config/nav.v1.ts` — remover entrada duplicada de Notas de Encomenda

