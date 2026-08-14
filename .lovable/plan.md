# Voltar ao menu principal nas páginas de Prospecção

## Diagnóstico
A página **Google Local Services** (`/dashboard/prospecting/google-local`) renderiza apenas o conteúdo dentro de `ModuleGuard`, sem o `DashboardLayout`. Por isso não tem barra lateral nem qualquer botão de regresso — só existem breadcrumbs (o ícone de casa é `sr-only`, invisível).

As páginas irmãs `WebSearchProspecting` e `ProfessionalProspecting` têm o mesmo problema; o `ProspectingHub` já usa `DashboardLayout`.

## O que vai ser feito
1. Envolver a página Google Local no `DashboardLayout`, recuperando a navegação lateral normal do FastCRM.
2. Adicionar um botão **"Voltar"** (seta à esquerda) no topo, junto ao título, que regressa ao hub de Prospecção (`/dashboard/prospecting`).
3. Tornar visível o item "Dashboard" nos breadcrumbs desta página (label em vez de texto oculto).
4. Aplicar o mesmo padrão às páginas Pesquisa Web e Profissionais, para consistência.

## Notas técnicas
- Ficheiros: `src/pages/GoogleLocalProspecting.tsx`, `src/pages/WebSearchProspecting.tsx`, `src/pages/ProfessionalProspecting.tsx`.
- Botão com `useNavigate()` e fallback fixo para `/dashboard/prospecting` (evita sair da app quando não há histórico).
- Sem alterações de lógica de negócio, créditos ou pesquisa.

## Critérios de aceitação
- Barra lateral do FastCRM visível nas três páginas de prospecção.
- Botão "Voltar" visível no cabeçalho e funcional por rato e teclado.
- Breadcrumb inicial clicável para `/dashboard`.
- Sem regressões no fluxo de pesquisa e importação de leads.
