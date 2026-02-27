
# Adicionar "Estratégia" ao Menu Lateral

## Problema

A pagina `/dashboard/strategy` (StrategyPage) existe e a rota esta registada no `App.tsx`, mas nao aparece no menu lateral. Esta apenas listada em `routes.legacy.ts` como `hidden: true` e no `extensionRegistry.ts` como parte do modulo `strategy-brief`, que so aparece se estiver instalado via Marketplace.

## Solucao

Adicionar "Estrategia" como item fixo na navegacao principal, para que apareca sempre no menu lateral.

## Alteracoes

### 1. `src/config/nav.v1.ts`

Adicionar um novo item no grupo "Ferramentas" (junto de "Automacoes", "Assistentes IA", etc.):

```
{ name: "Estratégia", href: "/dashboard/strategy", icon: Brain, group: "Ferramentas" }
```

Nota: o icone `Brain` ja esta importado neste ficheiro.

### 2. `src/config/nav.v2.ts`

Adicionar item na navegacao V2:

```
{ name: "Strategy", href: "/dashboard/strategy", icon: Brain }
```

Nota: o icone `Brain` ja esta importado neste ficheiro.

## Ficheiros a alterar

| Ficheiro | Accao |
|---|---|
| `src/config/nav.v1.ts` | Adicionar "Estrategia" no grupo "Ferramentas" |
| `src/config/nav.v2.ts` | Adicionar "Strategy" na lista de navegacao |
