

# Corrigir menu lateral na página de eBooks

## Problema
A página `EbooksPage.tsx` não está envolvida no `DashboardLayout`, ao contrário de todas as outras páginas do dashboard. Por isso o menu lateral não aparece.

## Solução
Envolver o conteúdo de `EbooksPage.tsx` com `<DashboardLayout>`, seguindo o padrão usado em todas as outras páginas (ex: `AskPage.tsx`, `Payments.tsx`, etc.).

### Alteração única — `src/pages/EbooksPage.tsx`
- Importar `DashboardLayout` de `@/components/layout/DashboardLayout`
- Envolver tanto o `EbooksList` como o `EbookEditor` dentro de `<DashboardLayout>`

