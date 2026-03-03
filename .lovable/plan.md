

# Melhorar Rodapé "Efetuado com FastCRM" nos Emails e Portal

## Estado Atual
Todos os templates de email já têm `Enviado por ${companyName} via FastCRM` — mas é uma simples linha de texto cinza, sem destaque visual.

## Plano

Substituir o rodapé simples por um **footer branded** consistente em todos os templates de email e no portal do fornecedor:

### Design do Footer (HTML email)
```
─────────────────────────────
  ⚡ Efetuado com FastCRM OS
  fastcrm.lovable.app
─────────────────────────────
```
- Separador horizontal (`<hr>`)
- Logo textual "⚡ FastCRM OS" em bold
- Texto "Efetuado com FastCRM OS — AI Revenue Operating System"
- Link para `fastcrm.lovable.app`
- Estilo: centrado, cor `#a1a1aa`, font-size 11px

### Ficheiros a Editar

1. **`supabase/functions/rfq-send/index.ts`** — Substituir as 4 linhas de footer (`Enviado por...`) nos templates `rfq_sent`, `rfq_reminder`, `rfq_thank_you`, `rfq_awarded` pelo novo bloco HTML branded

2. **`supabase/functions/rfq-deadline-reminder/index.ts`** — Mesmo tratamento no `buildReminderHTML`

3. **`src/pages/SupplierPortalPage.tsx`** (se existir footer) — Adicionar "Efetuado com FastCRM OS" no rodapé da página do portal do fornecedor

### Abordagem
Extrair o footer HTML para uma função `buildFooterHTML(companyName)` reutilizável em cada edge function, garantindo consistência.

