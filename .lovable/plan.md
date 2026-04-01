

# Plano: Melhorar indicação de recovery no WhatsApp card

## Diagnóstico

O card já mostra `recovery_state` e `recovery_attempt_count` na secção de info (linha 137-145), mas apenas como uma linha discreta dentro do painel de detalhes. Quando a recuperação está activamente em progresso (estados `checking`, `resyncing`, `reconnecting`), não há indicação visual destacada.

## Alteração — `WhatsAppConnectionCard.tsx`

Adicionar um **banner de progresso de recuperação** visível e destacado quando `recovery_state` é um dos estados activos (`checking`, `resyncing`, `reconnecting`). Este banner aparece entre o warning de sync health e os botões de acção.

**O que muda:**

1. **Novo bloco visual** (entre linhas 190-191) — banner com:
   - Ícone `Loader2` animado
   - Label do `recovery_state` actual (ex: "A resincronizar...")
   - Contador de tentativas: "Tentativa X" (usando `recovery_attempt_count`)
   - Timestamp da última tentativa (`recovery_last_attempt_at`) se disponível
   - Estilo: `border-blue-300 bg-blue-50` para indicar progresso activo

2. **Manter a linha existente** (137-145) no painel de info para estados não-activos (`repaired`, `failed`, `repair_required`) — sem alteração.

Exemplo do banner:

```text
┌─────────────────────────────────────────┐
│ ⟳  A resincronizar...                  │
│    Tentativa 2 · Última às 14:32       │
└─────────────────────────────────────────┘
```

## Ficheiro

| Ficheiro | Acção |
|---|---|
| `src/components/integrations/WhatsAppConnectionCard.tsx` | EDITAR — adicionar banner de recovery em progresso |

## Critérios de Aceitação

1. Banner azul aparece quando `recovery_state` é `checking`, `resyncing` ou `reconnecting`
2. Mostra label do estado + contagem de tentativas + timestamp da última tentativa
3. Não duplica informação — o painel de info existente continua para estados finais
4. Banner desaparece quando recovery termina (volta a `none`, `repaired` ou `failed`)

