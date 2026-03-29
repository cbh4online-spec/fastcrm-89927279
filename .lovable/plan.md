

# AUDITORIA UI/UX — FastCRM

## 1. RESUMO EXECUTIVO

**Avaliação geral:** O FastCRM tem uma fundação sólida — design system com tokens CSS bem estruturados (light/dark), componentes shadcn/ui adequados, e um visual premium com paleta dark+gold coerente. No entanto, existem inconsistências significativas entre módulos, problemas de densidade, hierarquia tipográfica irregular, e vários componentes que não atingem o nível enterprise esperado.

**Nível de maturidade visual:** 6.5/10 — Bom base system, mas execução desigual entre áreas.

**Principais falhas:**
- Inconsistência de padrões entre módulos (eBooks usa padrões diferentes do Dashboard)
- Excesso de tamanhos de texto micro (`text-[9px]`, `text-[10px]`) que prejudicam legibilidade
- Botões demasiado pequenos no editor (`h-7`) com texto `text-xs` + ícones — densidade extrema
- Template gallery cards sem thumbnails reais (apenas blocos de cor)
- Admin table sem usar o componente `Table` do design system
- Gradients excessivos em alguns CTAs (`bg-gradient-to-r from-primary to-primary/80`)

---

## 2. PROBLEMAS CRÍTICOS

### 2.1 Editor de eBooks — Toolbar overflow (CRÍTICA)
**Ficheiro:** `EbookEditor.tsx` linhas 532-578
**Problema:** A toolbar do capítulo tem ~12 botões em linha única, todos `h-7 text-xs`. Em ecrãs <1400px, os botões fazem overflow e ficam cortados ou comprimidos. Não há `flex-wrap`, `overflow-x-auto`, nem agrupamento visual.
**Impacto:** Funcionalidades inacessíveis, aspecto amador.
**Correção:** Agrupar ações em dropdowns lógicos (AI actions, media actions), usar `flex-wrap` e separadores visuais.

### 2.2 Textos `text-[9px]` e `text-[10px]` — Legibilidade (CRÍTICA)
**Ficheiros:** AdaptiveSidebar (L277, L78, L79), EbookEditor (L403-406, L441, L543, L551, L557), TemplateCard (L57, L68), EbooksList (L100, L104, L108, L191), TopBar (L88)
**Problema:** Mais de 30 instâncias de texto abaixo de 11px. Em ecrãs standard (1080p, sem scaling), são ilegíveis. WCAG recomenda mínimo 12px para body text.
**Impacto:** Acessibilidade e legibilidade gravemente afetadas.
**Correção:** Substituir `text-[9px]` → `text-[10px]` e `text-[10px]` → `text-xs` (12px) como regra base. Usar `text-[10px]` apenas para badges/contadores.

### 2.3 Criação do eBook — UX duplicada e confusa (ALTA)
**Ficheiro:** `EbooksPage.tsx` + `EbooksList.tsx`
**Problema:** Existem DOIS caminhos de criação: o botão "Criar com IA" e "Criar Manual" no `EbooksList` (que abrem diálogos internos) e o modal de criação do `EbooksPage` (Usar Template / Assistente IA / Do Zero). O `onOpenWizard` do EbooksList dispara o modal de 3 opções, mas o botão "Criar Manual" abre um diálogo DIFERENTE dentro do EbooksList. Fluxo fragmentado.
**Impacto:** Utilizador confuso com múltiplos entry points que fazem coisas diferentes.
**Correção:** Consolidar: o botão principal deve sempre abrir o modal de 3 opções. Remover o diálogo de criação manual do EbooksList.

---

## 3. INCONSISTÊNCIAS DE DESIGN SYSTEM

| Problema | Local | Gravidade |
|---|---|---|
| Admin table usa `<table>` raw em vez de `Table` component | EbookTemplatesAdminPage | Média |
| Badges status inconsistentes: alguns usam `className` direto, outros usam `variant` | EbooksList vs StatusBadge design system | Média |
| Sidebar usa texto `text-[10px]` para labels, mas design system recomendaria `text-xs` | AdaptiveSidebar L277, L465 | Média |
| `PageHeader` component existe mas não é usado nas páginas de eBooks/templates | EbooksPage, GalleryPage, AdminPage | Média |
| Gradient buttons (`bg-gradient-to-r from-primary...`) usados inconsistentemente — alguns CTAs têm, outros não | EbooksList, PageHeader, Dashboard | Baixa |
| Cards de eBook usam `border-border/60` enquanto template cards usam `border-border/50` | EbooksList vs TemplateCard | Baixa |
| `TemplatePreviewModal` usa sidebar com padding `p-3` mas page list items têm `p-2` — ritmo vertical irregular | TemplatePreviewModal L56-70 | Baixa |

---

## 4. MELHORIAS RECOMENDADAS

### QUICK WINS (podem ser feitos imediatamente)

1. **Aumentar tamanhos mínimos de texto** — global find/replace de `text-[9px]` para `text-[10px]`, e usar `text-xs` como mínimo para labels
2. **Usar Table component na admin page** — substituir `<table>` por shadcn Table
3. **Usar PageHeader nas páginas de eBooks** — consistência com o resto do app
4. **Template thumbnails** — melhorar o mini-preview nos TemplateCards com mais detalhe visual (simular 3-4 blocos de layout em vez de 2 blocos genéricos)
5. **TemplatePreviewModal** — aumentar sidebar de `w-48` para `w-56` para melhor legibilidade dos nomes de páginas

### MELHORIAS ESTRUTURAIS

6. **Editor toolbar** — agrupar ações IA num dropdown, media actions noutro, e manter apenas undo/redo/titulo visíveis como botões diretos
7. **Consolidar fluxo de criação** — remover dialog de criação do EbooksList, usar apenas o modal centralizado do EbooksPage
8. **Gallery filters** — usar o padrão pill/tabs do `PageHeader` em vez de botões outline soltos
9. **Template admin** — adicionar color swatches maiores, descrição truncada, e usar o componente `Badge` com variantes semânticas do design system

### MELHORIAS PREMIUM

10. **Template gallery** — adicionar header visual com contagem, e um CTA "Criar Template" para admins
11. **Template card hover** — efeito de zoom suave no thumbnail + blur overlay com ações
12. **EbookEditor sidebar** — adicionar numeração clara e indicador de progresso por capítulo

---

## 5. PLANO DE CORREÇÃO (por ordem de implementação)

### Batch 1 — Quick Wins de Legibilidade e Consistência
1. Fix textos `text-[9px]` → `text-[10px]` globalmente nos componentes de eBooks e sidebar
2. Substituir `<table>` raw na admin page pelo componente `Table` do shadcn
3. Usar `PageHeader` nas 3 páginas de eBooks (Gallery, Admin, EbooksList)
4. Normalizar border opacity em cards (`border-border/50` como padrão)

### Batch 2 — UX e Layout
5. Consolidar fluxo de criação de eBooks (single entry point)
6. Editor toolbar: wrap + dropdown agrupamento
7. Template card: melhorar mini-preview com mais blocos simulados
8. Gallery filters: usar pill style consistente com PageHeader tabs

### Batch 3 — Polish Premium
9. TemplatePreviewModal: sidebar wider, melhor hierarquia de texto
10. Template admin: swatches, badges consistentes, bulk actions
11. Empty states no módulo de templates (usar EmptyState do design system)

### Notas
- Não alterar lógica de negócio
- Não alterar schema de dados
- Todas as correções são CSS/Tailwind e reorganização de componentes
- Manter compatibilidade com dark mode (já testado via tokens CSS)
- Priorizar desktop (mobile é consulta na V1)

