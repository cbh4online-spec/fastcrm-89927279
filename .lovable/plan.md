

## Adicionar módulo de Agendamento ao menu CRM

### Problema
O módulo de Agendamento (`/dashboard/scheduling`) existe como rota mas não aparece no grupo CRM da sidebar.

### Alterações

**1. `src/i18n/locales/en/nav.json` e `pt/nav.json`**
- Adicionar chave `"scheduling": "Scheduling"` (en) / `"scheduling": "Agendamento"` (pt)

**2. `src/config/nav.v2.ts`**
- Adicionar entrada no array `children` do grupo `groupCrm`, após `fastmatch`:
```typescript
{ nameKey: "scheduling", name: t("scheduling"), href: "/dashboard/scheduling", icon: Calendar, iconColor: "text-emerald-500" },
```
- O ícone `Calendar` já está importado no ficheiro.

São apenas 2 ficheiros a alterar, sem impacto noutras áreas.

