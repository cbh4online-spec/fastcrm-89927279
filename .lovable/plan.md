

# Criar página pública /changelog

## Diagnóstico
A rota `/changelog` não existe — retorna 404. O footer SEO já linka para `/changelog`. Não existe nenhuma página pública de changelog do produto (o `product_changelog` existente é interno, para auditoria de produtos no backoffice).

## Plano

### 1. Criar página `src/pages/ChangelogPage.tsx`
- Página pública standalone seguindo o mesmo padrão da PricingPage (Helmet + LandingStickyHeader + LandingFooter)
- Secção principal com timeline de atualizações do produto (versões, novas funcionalidades, melhorias, correções)
- Conteúdo inicial com fallback hardcoded (últimas 5-6 entradas relevantes do FastCRM)
- Query opcional à tabela `fastclub_content_sections` com `page_key = 'changelog'` para permitir gestão futura via DB
- Cada entrada com: data, título, tipo (badge: Nova Funcionalidade / Melhoria / Correção), descrição
- Design escuro consistente com landing page

### 2. Registar rota em `DashboardCoreRoutes.tsx`
- Adicionar `<Route path="/changelog" element={<ChangelogPage />} />` junto das rotas públicas (ao lado de `/pricing`)

### Ficheiros
- **Novo**: `src/pages/ChangelogPage.tsx`
- **Editado**: `src/routes/crm/DashboardCoreRoutes.tsx` (lazy import + rota)

