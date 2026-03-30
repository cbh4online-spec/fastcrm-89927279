

# 2ª Vaga de Bibliotecas — Infraestrutura e Segurança

## Diagnóstico

O documento lista 10 bibliotecas divididas em 3 batches de prioridade. Verificando o `package.json` actual, **nenhuma** destas está instalada. Algumas já têm dependências relacionadas no projecto (ex: `zustand`, `nanoid`, `currency.js` já existem).

## Plano de Instalação

### Batch 7 — Segurança e Pagamentos (Críticas)

| Package | Justificação |
|---|---|
| `@stripe/stripe-js` + `@stripe/react-stripe-js` | SDK frontend para os 6 edge functions de checkout existentes |
| `dompurify` + `@types/dompurify` | Sanitização XSS para todo o HTML renderizado (Inbox, Email, Markdown, Tiptap) |
| `libphonenumber-js` | Validação e formatação de telefones internacionais |

**Config extra**: Será necessário um secret `VITE_STRIPE_PUBLISHABLE_KEY` para o Stripe funcionar no browser.

### Batch 8 — Estabilidade e UX (Alta)

| Package | Justificação |
|---|---|
| `react-error-boundary` | Error boundaries para prevenir crashes globais |
| `slugify` | Slugs URL-safe com suporte a acentos portugueses |
| `react-intersection-observer` | Infinite scroll e lazy loading (complementa `@tanstack/react-virtual`) |
| `nuqs` | Sincronização de filtros com URL query string |

### Batch 9 — Qualidade e Polish (Média)

| Package | Justificação |
|---|---|
| `@react-email/components` + `@react-email/render` | Email templates como componentes React |
| `react-number-format` | Inputs formatados para EUR, NIF, IBAN |
| `use-debounce` | Debounce de pesquisa (reduz queries desnecessárias) |

## Implementação

### Passo 1 — Instalar Batch 7
```
npm install @stripe/stripe-js @stripe/react-stripe-js dompurify @types/dompurify libphonenumber-js
```

### Passo 2 — Instalar Batch 8
```
npm install react-error-boundary slugify react-intersection-observer nuqs
```

### Passo 3 — Instalar Batch 9
```
npm install @react-email/components @react-email/render react-number-format use-debounce
```

### Passo 4 — Integração base imediata

Após instalar, criar utilitários/wrappers prontos a usar:

1. **`src/utils/sanitize.ts`** — wrapper de DOMPurify para uso global
2. **`src/utils/phone.ts`** — helpers de validação/formatação de telefone
3. **`src/utils/slug.ts`** — helper de geração de slugs
4. **`src/components/ui/ErrorBoundary.tsx`** — componente ErrorBoundary reutilizável com fallback UI consistente
5. **`src/lib/stripe.ts`** — inicialização do Stripe com `loadStripe()`

### Passo 5 — Aplicar DOMPurify nos pontos críticos existentes

Sanitizar `dangerouslySetInnerHTML` já existente em:
- `OpportunityNotesTab` (notas rich-text)
- Qualquer renderização de HTML do utilizador

## Critérios de aceitação

- Todos os 13 packages instalados sem conflitos
- Build sem erros
- Utilitários base criados e prontos a importar
- DOMPurify aplicado nos pontos de `dangerouslySetInnerHTML` existentes
- ErrorBoundary wrapping nos módulos de maior risco (dashboards com Recharts)

