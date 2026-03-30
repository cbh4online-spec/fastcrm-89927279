

# Verificação e Ativação das Livrarias — Plano de Execução

## Diagnóstico

### Configurações base — estado actual

| Config | Estado |
|---|---|
| Tailwind plugins (animate, typography, radix, container-queries) | ✅ Feito |
| Fonts Inter + JetBrains Mono | ✅ Importados em `main.tsx` |
| ReactQueryDevtools | ✅ Em `App.tsx` |
| PWA (`vite-plugin-pwa`) | ✅ Em `vite.config.ts` |
| ErrorBoundary | ✅ Existe em `src/components/ui/ErrorBoundary.tsx` |
| `vitest.config.ts` | ✅ Existe |
| **Skeleton CSS** | ❌ Não importado |
| **Driver.js CSS** | ❌ Não importado |
| **Sentry init em `main.tsx`** | ❌ Wrapper existe em `src/lib/sentry.ts` mas nunca é chamado |
| **PostHog init em `main.tsx`** | ❌ Wrapper existe em `src/lib/posthog.ts` mas nunca é chamado |

### Ativações nos módulos — tudo por fazer (0/15)

## Plano de Execução

Dado o volume (~15 ativações, cada uma tocando múltiplos ficheiros), proponho dividir em **3 fases** executadas em mensagens separadas. Cada fase é auto-contida e o build deve passar no final.

---

### Fase 1 — Configurações em falta + Fundações (esta mensagem)

1. **Importar CSS em falta** — adicionar `react-loading-skeleton/dist/skeleton.css` e `driver.js/dist/driver.css` em `src/main.tsx`
2. **Chamar Sentry init** — importar e chamar `initSentry()` de `src/lib/sentry.ts` em `main.tsx`
3. **Chamar PostHog init** — importar e chamar `initPostHog()` de `src/lib/posthog.ts` em `main.tsx`
4. **Criar `SkeletonTheme` wrapper** — componente reutilizável com cores do dark theme (`baseColor="#1a1a2e"`, `highlightColor="#2a2a4a"`)
5. **Criar `MarkdownRenderer`** — componente com `react-markdown` + `remarkGfm` + `@tailwindcss/typography` + `dompurify`
6. **Criar `useConfetti` hook** — wrapper de `canvas-confetti` com cores amber/gold
7. **Criar `useAnalytics` hook** — wrapper de PostHog com `track`, `identify`, `page`
8. **Criar `formatEUR` / `EUR` utility** em `src/lib/currency.ts` — com `currency.js`
9. **Criar `PhoneInput` component** — com `libphonenumber-js` + `react-number-format`
10. **Criar `CurrencyInput` component** — com `react-number-format` para EUR
11. **Criar `PDFViewer` component** — com `react-pdf` e configuração do worker

### Fase 2 — Componentes de infraestrutura (mensagem seguinte)

12. **Criar `DataTable` genérico** — com `@tanstack/react-table` (sorting, filtering, pagination, selection, column visibility)
13. **Criar `FileUpload` + `ImageUpload`** — com `react-dropzone` + `browser-image-compression` + `react-easy-crop`
14. **Criar `useURLFilters` hook** — com `nuqs` para filtros sincronizados com URL
15. **Melhorar Global Search (⌘K)** — integrar `fuse.js` + `match-sorter` + `use-debounce`

### Fase 3 — Integração nos módulos (mensagem final)

16. **Substituir loading spinners** por skeleton loaders em todas as páginas de lista
17. **Aplicar `MarkdownRenderer`** no ebook, Knowledge Base, AI Copilot
18. **Aplicar `formatEUR`** em propostas, facturas, produtos, KPIs
19. **Aplicar `PhoneInput`** em formulários de contactos/leads/empresas
20. **Implementar DnD no Pipeline Kanban** com `@dnd-kit`
21. **Implementar FullCalendar** no módulo calendário
22. **Implementar Maps** no Security Ops
23. **Aplicar confetti** na gamificação e pipeline wins

---

## Critérios de Aceitação

- Todas as CSS imports necessárias presentes
- Sentry e PostHog inicializam condicionalmente (sem keys = graceful skip)
- Componentes reutilizáveis criados e prontos a importar
- Build sem erros após cada fase
- Nenhuma funcionalidade existente quebrada

## Riscos

- **Fase 3 é a mais arriscada** — toca em muitos componentes existentes; cada substituição deve ser feita com cuidado
- **react-pdf worker** — precisa de CDN ou bundle do `pdf.worker.min.js`
- **FullCalendar** — pesado (~200KB), deve ser lazy-loaded

Aprovar para iniciar pela **Fase 1**?

