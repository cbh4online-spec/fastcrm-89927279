

# Aplicar Cores Semânticas à Sidebar V2

## Alterações

### 1. `src/config/nav.v2.ts` — Adicionar `iconColor` aos tipos e itens

Adicionar `iconColor?: string` a `NavV2CoreItem`, `NavV2GroupChild` e `NavV2Group`. Aplicar as mesmas cores do V1:

- Core items: cores por contexto (violet para Home/Mural/Ask, blue para Inbox, sky para Reports, emerald para CRM items, amber para Pipeline, etc.)
- Groups: cor no grupo herdada pelos children (amber Vendas, orange B2B, pink Loja, rose Marketplace, yellow FastClub, indigo Marketing, cyan Estratégia, slate Ferramentas, teal Student Journey, fuchsia Instagram Looter)
- Footer (Settings): `text-gray-500`

### 2. `src/components/layout/Sidebar.tsx` — Usar `iconColor` nos ícones

**`renderLink`** (linha 142): Substituir a cor do ícone — em vez de só `active && "text-primary"`, usar `item.iconColor` quando inactivo e manter `text-primary` quando activo.

**`renderGroup`** (linha 170): Aplicar `group.iconColor` ao ícone do grupo trigger.

**Remover bordas separadoras**: Substituir `border-b border-white/5` entre secções por espaçamento (`mt-4`), alinhando com o estilo Basepoint do V1.

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/config/nav.v2.ts` | Adicionar `iconColor` a tipos e todos os itens |
| `src/components/layout/Sidebar.tsx` | Aplicar `iconColor` nos renders de ícones |

