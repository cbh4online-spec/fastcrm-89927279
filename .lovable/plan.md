
# Plano: Corrigir Auto-Pilot - Estrutura de Dados e Fallback de Embeddings

## Diagnóstico

O sistema falha em dois pontos:

### Problema 1: Extração Incorreta da Resposta AI
O webhook `ghl-webhook-message` procura `aiResult.suggestions` mas a resposta vem com estrutura `aiResult.result.suggestions`.

```text
Resposta do ai-inbox-reply:
{
  "action": "suggest_reply",
  "result": {                    ← As sugestões estão aqui
    "reasoning": "...",
    "suggestions": [{ "text": "..." }]
  },
  "knowledgeUsed": false
}

Código atual (linha 787):
aiResult.suggestions?.[0]?.text     ← Retorna undefined

Código correto:
aiResult.result?.suggestions?.[0]?.text  ← Retorna a resposta
```

### Problema 2: Embeddings Falham (Impacto Menor)
O Lovable Gateway não suporta `text-embedding-ada-002`:
```
Embedding API error: invalid model: text-embedding-ada-002
```
Isto causa `Found 0 relevant entries` - o conhecimento não é usado, mas a geração continua.

## Solução

### Alteração 1: Corrigir Extração no Webhook (Crítico)
Ficheiro: `supabase/functions/ghl-webhook-message/index.ts`

```text
Linha 787: Corrigir acesso à estrutura

Antes:
const suggestion = aiResult.suggestions?.[0]?.text || aiResult.flowResponse;

Depois:
const suggestion = aiResult.result?.suggestions?.[0]?.text || aiResult.flowResponse;
```

### Alteração 2: Fallback para Embeddings (Melhoria)
Ficheiro: `supabase/functions/ai-inbox-reply/index.ts`

Quando embeddings falham, usar fallback de pesquisa por texto:

```text
Linha 194-210: Adicionar fallback

1. Tentar embeddings via Lovable Gateway
2. Se falhar (modelo não suportado), usar fallback:
   - Pesquisa por texto simples (ILIKE)
   - Ou usar match de keywords
3. Log indicando qual método foi usado
```

## Ficheiros a Modificar

| Ficheiro | Alteração | Prioridade |
|----------|-----------|------------|
| `supabase/functions/ghl-webhook-message/index.ts` | Corrigir `aiResult.result?.suggestions` | **Crítica** |
| `supabase/functions/ai-inbox-reply/index.ts` | Adicionar fallback de pesquisa textual | Melhoria |

## Fluxo Após Correção

```text
[Mensagem "Teste" recebida]
       ↓
[ghl-webhook-message]
       ↓
[triggerAutopilotResponse]
       ↓
[ai-inbox-reply] → Gera resposta (mesmo sem knowledge base)
       ↓
[Retorna: { result: { suggestions: [{text: "Olá! ..."}] }}]
       ↓
[Webhook extrai: aiResult.result.suggestions[0].text] ✅
       ↓
[ghl-send-message]
       ↓
[Resposta enviada ao contacto via Instagram]
```

## Teste de Verificação

1. Deploy das alterações
2. Enviar mensagem de teste via Instagram
3. Verificar logs:
   - `[AUTOPILOT] AI generated response { preview: "..." }` ✅
   - `[AUTOPILOT] Message sent successfully` ✅
4. Confirmar resposta no GHL/Instagram
