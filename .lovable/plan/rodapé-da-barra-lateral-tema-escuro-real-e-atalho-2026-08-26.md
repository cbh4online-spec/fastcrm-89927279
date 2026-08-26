# Rodapé da barra lateral: tema escuro real e atalho "?"

## Diagnóstico (verificado no código)

- Os três botões de tema (`ThemeSwitcher` em `src/components/layout/InvoiceXpressSidebar.tsx`) chamam mesmo `setTheme` do `next-themes`, e o `ThemeProvider` está ativo em `App.tsx` (`attribute="class"`, `enableSystem`). O Tailwind tem `darkMode: ["class"]`.
- O que anula o efeito é o `src/index.css`: o bloco `.dark, .dark .light, .light` repete exatamente os valores do tema claro, com o comentário "Dark mode intentionally mirrors light". Ou seja, mudar de tema troca a classe no `<html>` mas nenhum token muda.
- O texto "Prima ? para ver os atalhos" não tem handler global: o único listener da tecla `?` está em `src/hooks/useInboxHotkeys.ts` (só dentro do Inbox). Existe já um modal reutilizável em `src/components/keyboard-shortcuts/KeyboardShortcutsModal.tsx`, hoje só aberto pelo `HelpSupportDropdown`.

## O que vai ser feito

### 1. Tema escuro real
- Substituir o bloco espelhado do `index.css` por uma paleta escura própria, mantendo a identidade FastCRM (azul elétrico como primária, superfícies navy profundas): `background`, `card`, `popover`, `muted`, `border`, `input`, toda a família `sidebar-*`, tokens de estado (`success`, `warning`, `info`, `destructive`), gradientes e sombras adaptados ao fundo escuro.
- Manter `.light` como override explícito de subárvore (usado em zonas que devem ficar sempre claras, como páginas públicas/loja) — passa a conter apenas os valores claros, sem interferir com `.dark`.
- Garantir contraste AA nos textos secundários (`muted-foreground`, `sidebar-foreground/55`) e foco visível.
- No `ThemeSwitcher`, usar `resolvedTheme` para o estado ativo do botão "sistema" e evitar flash de hidratação (só marcar ativo depois de montado).

### 2. Atalho "?" global
- Novo hook `src/hooks/useGlobalShortcuts.ts`: escuta `?` (Shift+/) e ignora quando o foco está em input/textarea/contenteditable ou há um diálogo aberto.
- Montá-lo no layout do dashboard, com o `KeyboardShortcutsModal` existente controlado por estado; `Esc` fecha.
- O texto do rodapé passa a ser clicável (botão acessível) para abrir o mesmo modal com rato.
- Rever `src/data/keyboard-shortcuts.ts` para incluir os atalhos reais já existentes (⌘K, Alt+←/→ na navegação de registos).

### 3. Verificação
- Alternar claro/sistema/escuro e confirmar persistência entre recargas.
- Passagem visual em escuro: dashboard IX, listagens CRM, fichas de detalhe, diálogos, tabelas e barra lateral (sem texto ilegível nem fundos brancos "furados").
- `?` abre o modal em qualquer página do dashboard e não dispara ao escrever em campos.

## Notas técnicas

- Zero alterações de backend, RLS ou dados.
- Componentes com cores hardcoded (`bg-white`, `text-navy`) que quebrem em escuro são convertidos para tokens semânticos à medida que forem encontrados na passagem visual.

## Riscos por validar

- A app é extensa: podem existir ecrãs com cores fixas que só aparecem mal em escuro depois de usados. A passagem cobre os fluxos principais; os restantes corrigem-se por reporte.
- Páginas públicas/loja mantêm-se sempre claras (identidade de marca), salvo indicação em contrário.
