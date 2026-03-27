

## Assistente IA no Compositor de Email

Adicionar um botão de IA na toolbar do `ComposeEmailDialog` que permite ao utilizador gerar, melhorar e ajustar o tom de emails — reutilizando a infraestrutura existente do `useInboxAI` e a edge function `ai-inbox-reply`.

---

### Funcionalidades

1. **Gerar email do zero** — o utilizador descreve o que quer (ex: "proposta comercial para curso X") e a IA gera assunto + corpo
2. **Melhorar texto existente** — reescrever, encurtar, tornar mais direto
3. **Ajustar tom** — formal, friendly, comercial, empático
4. **Gerar resposta** — quando há contexto de conversa, sugere uma resposta adequada

### Alterações

| Ficheiro | O que muda |
|---|---|
| `src/components/email/AIEmailAssistPanel.tsx` | **Novo** — Painel/popover com: input para prompt livre ("Escreve um email sobre..."), botões rápidos de ação (Melhorar, Encurtar, Formal, Friendly, Comercial), loading state, e preview do resultado com botões "Aplicar" / "Tentar de novo" |
| `src/components/email/ComposeEmailDialog.tsx` | Adicionar ícone `Sparkles` na toolbar (ao lado do botão de pagamento), que abre o `AIEmailAssistPanel`. Passar `body`, `subject`, `setBody`, `setSubject` como props para o painel poder ler e injetar conteúdo |

### Detalhes Técnicos

- Reutiliza `useInboxAI` existente — já tem `suggestReplies` (gerar), `modifyReply` (melhorar/encurtar/formal/friendly/comercial) e integração com knowledge base + personas
- Quando o body está vazio, mostra campo de prompt livre + botão "Gerar Email"
- Quando o body tem conteúdo, mostra ações de modificação (Encurtar, Formal, Friendly, Comercial, Reescrever)
- O resultado aparece com preview e botões "Aplicar ao email" (substitui body) ou "Descartar"
- Cada utilização consome créditos via `ai-gate` (tier `light`) — já implementado na edge function `ai-inbox-reply`
- Não é necessário criar nova edge function — tudo passa pelo `ai-inbox-reply` existente

### Fluxo UX

```text
┌─ Toolbar ──────────────────────────────┐
│ B I 🔗 ☰ │ Templates │ 📎 │ 💳 │ ✨IA │
└────────────────────────────────────────┘
                                      ↓ click
┌─ AI Assist Popover ────────────────────┐
│ 💡 "Descreva o email que quer..."      │
│ [________________________________]     │
│ [Gerar Email]                          │
│                                        │
│ ── ou modificar texto existente ──     │
│ [Encurtar] [Formal] [Friendly]         │
│ [Comercial] [Reescrever]               │
│                                        │
│ ── Resultado ──                        │
│ "Caro Sr. Silva, na sequência..."      │
│ [Aplicar] [Tentar de novo] [Descartar] │
└────────────────────────────────────────┘
```

