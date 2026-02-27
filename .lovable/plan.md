

# Redesign Visual da Sidebar V1 — Estilo Basepoint

## Referência

A imagem Basepoint mostra: fundo limpo, ícones com cores semânticas por categoria, labels de grupo subtis em cinza claro, espaçamento generoso, sem bordas pesadas nos itens, texto escuro simples.

## Alterações

### 1. `src/config/nav.v1.ts` — Adicionar `iconColor` por grupo/item

Adicionar `iconColor?: string` ao tipo `NavV1Item` com cores semânticas por grupo:

| Grupo | Cor do ícone (Tailwind) |
|---|---|
| Principal | `text-violet-500` |
| Comunicação | `text-blue-500` |
| CRM | `text-emerald-500` |
| Vendas | `text-amber-500` |
| Portal B2B | `text-orange-500` |
| Loja Online | `text-pink-500` |
| Marketplace C2C | `text-rose-500` |
| FastClub | `text-yellow-500` |
| Marketing | `text-indigo-500` |
| Estratégia | `text-cyan-500` |
| Relatórios | `text-sky-500` |
| Ferramentas | `text-slate-500` |
| Student Journey | `text-teal-500` |
| Instagram Looter | `text-fuchsia-500` |
| Definições | `text-gray-500` |

Cada item herda a cor do seu grupo. Aplicar `iconColor` a todos os itens.

### 2. `src/components/layout/SidebarV1.tsx` — Aplicar cores e estilo Basepoint

**Ícones coloridos**: Substituir a lógica actual de cor do ícone (`active ? "text-foreground" : "text-muted-foreground"`) por `item.iconColor` quando disponível, mantendo destaque no activo.

**Labels de grupo**: Renderizar o nome do grupo como label subtil (uppercase, 11px, tracking-wider, text-muted-foreground) antes do primeiro item de cada grupo — semelhante à imagem (Records, Lists, Favorites).

**Espaçamento**: Adicionar `mt-4` antes de cada label de grupo para separação visual clara. Remover os `<Separator>` actuais (linhas horizontais) — no estilo Basepoint não há linhas, só espaço.

**Itens**: Manter `py-1.5`, remover `font-medium` dos itens não activos para texto mais leve. O item activo fica com `bg-muted font-medium`.

**Remover ícone Puzzle**: Substituir pelo indicador de cor — itens de módulo já ficam visualmente distintos por pertencerem a grupos específicos com cores próprias.

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/config/nav.v1.ts` | Adicionar `iconColor` a todos os itens |
| `src/components/layout/SidebarV1.tsx` | Renderizar labels de grupo, aplicar `iconColor`, remover Separators, remover Puzzle icon |

