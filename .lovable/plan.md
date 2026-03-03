

# Remover moduleSlug de Propostas e Faturas

Editar `src/config/nav.v1.ts`, linhas 113-114: remover `moduleSlug: "proposals"` e `moduleSlug: "invoices"` para que estes itens apareçam sempre na sidebar sem depender do Marketplace.

**Antes:**
```ts
{ name: "Propostas", href: "/dashboard/proposals", icon: Presentation, group: "Vendas", separator: true, moduleSlug: "proposals" },
{ name: "Faturas", href: "/dashboard/invoices", icon: Receipt, group: "Vendas", moduleSlug: "invoices" },
```

**Depois:**
```ts
{ name: "Propostas", href: "/dashboard/proposals", icon: Presentation, group: "Vendas", separator: true },
{ name: "Faturas", href: "/dashboard/invoices", icon: Receipt, group: "Vendas" },
```

Alteração de 1 ficheiro, 2 linhas.

