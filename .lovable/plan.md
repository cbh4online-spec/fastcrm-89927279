

# Plano: Melhorar a Sidebar Adaptativa

A sidebar adaptativa já existe com a maioria das funcionalidades pedidas (menus por função, estilos por idade, badges, gamificação, quota, quick actions, collapse, mobile overlay). Este plano foca nas **lacunas** entre o que existe e a especificação completa.

---

## O que já funciona

- Menus por função (Vendedor, Gestor, Diretor, CEO)
- Estilos por idade (young/standard/senior: ícones, texto, alturas)
- Badges com cores por severidade e pulse
- Gamificação strip (young)
- Quota progress bar (vendedor)
- Quick actions (young + standard)
- Collapse para 64px com tooltips
- Mobile overlay com swipe-to-close
- Grupos colapsáveis (standard), sempre abertos (senior)

---

## Melhorias a implementar

### 1. Secção de Alertas Críticos
Adicionar entre o header/quota e o menu principal uma secção destacada que aparece **apenas quando existem alertas críticos** (deals parados, meta em risco). Consulta a base de dados para obter alertas reais.

**Ficheiros:** `AdaptiveSidebar.tsx`, novo hook `useSidebarAlerts.ts`

### 2. Badges com dados reais
Substituir os badges mock (`activities_today: 5`, `pending_decisions: 3`) por queries reais à base de dados — contar atividades do dia, decisões pendentes, follow-ups atrasados.

**Ficheiros:** `useSidebarBadges.ts` (expandir queries existentes)

### 3. Bloquear collapse para seniores
Quando `ageGroup === "senior"`, esconder o botão de collapse e forçar a sidebar sempre expandida (280px). Remover a transição para 64px.

**Ficheiros:** `AdaptiveSidebar.tsx`

### 4. Atalho de teclado Cmd/Ctrl+B
Adicionar `useEffect` global para toggle do collapse via teclado.

**Ficheiros:** `AdaptiveSidebar.tsx`

### 5. Swipe da borda esquerda para abrir
O código actual detecta o swipe mas não chama `onOpen`. Corrigir para invocar um callback de abertura quando swipe > 50px a partir da borda (x < 20px).

**Ficheiros:** `AdaptiveSidebar.tsx`, `DashboardLayout.tsx` (passar `onOpen` callback)

### 6. Módulos do Marketplace na sidebar
Consultar `marketplace_modules` instalados e renderizar como secção dinâmica no final do menu (antes de Definições).

**Ficheiros:** `AdaptiveSidebar.tsx`, novo hook ou extensão do existente

### 7. Acessibilidade (ARIA)
Adicionar `role="navigation"`, `aria-label`, `aria-expanded` nos grupos colapsáveis, e `aria-current="page"` nos links activos.

**Ficheiros:** `AdaptiveSidebar.tsx`

---

## Ordem de implementação

1. Alertas Críticos + Badges reais (maior impacto funcional)
2. Senior collapse lock + Accessibility
3. Keyboard shortcut + Swipe-to-open fix
4. Marketplace modules integration

---

## Detalhes técnicos

- **useSidebarAlerts**: query `opportunities` para deals parados > 5 dias + check se quota < 70% do esperado para o dia do mês
- **useSidebarBadges expandido**: adicionar queries para `activities` (today, overdue), `proposals` (pending), `kernel_decisions` (pending)
- **Senior lock**: condicional `if (ageGroup === 'senior') return` no `toggleCollapse` e `className` forçando `w-[280px]`
- **Swipe-to-open**: `DashboardLayout` passa `onOpen={() => setSidebarOpen(true)}` e o `AdaptiveSidebar` emite esse callback no edge swipe handler

