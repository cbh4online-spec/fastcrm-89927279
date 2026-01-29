

# Plano: Corrigir Envio de Instagram DM via GHL

## Problema Identificado

O GHL rejeita o envio de mensagens Instagram DM com o erro "Contact has no Instagram id, skipping" porque:

1. **Limitação da API do Instagram**: O Instagram não permite enviar DMs a utilizadores que não tenham iniciado uma conversa primeiro (política anti-spam)
2. **Bug no mapeamento de canal**: Os logs mostram `messageType: "SMS"` quando deveria ser `"IG"`

## Análise dos Logs

```text
[GHL-SEND] Sending to GHL {
  ghlContactId: "LWSFlLhVfR8hxjq8u68p",
  messageType: "SMS",    ← ERRADO! Deveria ser "IG"
  channel: "IG"
}
```

## Solução em Duas Partes

### Parte 1: Corrigir Mapeamento de Canal (Bug)

**Ficheiro**: `supabase/functions/ghl-send-message/index.ts` (linha ~472)

Adicionar mapeamento para `"IG"` na função `mapChannelToGHLType`:

```typescript
function mapChannelToGHLType(channel: string): string {
  const typeMap: Record<string, string> = {
    "sms": "SMS",
    "whatsapp": "WhatsApp",
    "email": "Email",
    "messenger": "FB",
    "facebook": "FB",
    "instagram": "IG",
    "IG": "IG",  // Adicionar este mapeamento directo
  };
  return typeMap[channel.toLowerCase()] || channel.toUpperCase();
}
```

### Parte 2: Tratamento de Erro Específico para Instagram

Adicionar lógica para detectar quando o Instagram não está disponível e informar o utilizador:

```typescript
// Na verificação de erros (após linha 365)
if (!sendResponse.ok) {
  // Detectar erro específico de Instagram
  if (responseText.includes("no Instagram id") || 
      responseText.includes("skipping")) {
    return new Response(
      JSON.stringify({ 
        error: "O contacto não tem uma conta Instagram vinculada no GHL. " +
               "O Instagram só permite respostas a mensagens recebidas.",
        ghlStatus: sendResponse.status,
        details: responseData
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ... resto do tratamento de erros
}
```

### Parte 3: Actualizar UI para Mostrar Limitação

**Ficheiro**: `src/components/inbox/QuickInstagramDialog.tsx`

Adicionar aviso sobre a limitação do Instagram:

```tsx
<div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
  <div className="flex items-start gap-2">
    <Info className="w-4 h-4 text-blue-500 mt-0.5" />
    <p className="text-xs text-blue-600 dark:text-blue-400">
      Nota: O Instagram só permite enviar mensagens a utilizadores que já 
      iniciaram uma conversa consigo. Se o contacto nunca interagiu via 
      Instagram, a mensagem poderá falhar.
    </p>
  </div>
</div>
```

## Ficheiros a Modificar

1. `supabase/functions/ghl-send-message/index.ts` - Corrigir mapeamento e tratamento de erro
2. `src/components/inbox/QuickInstagramDialog.tsx` - Adicionar aviso ao utilizador

## Resultado Esperado

1. O mapeamento de canal funcionará correctamente (`IG` → `IG`)
2. Mensagens de erro serão mais claras para o utilizador
3. O utilizador será avisado sobre a limitação antes de tentar enviar

## Limitação Fundamental

É importante notar que **não podemos contornar** a limitação do Instagram - só é possível responder a utilizadores que já enviaram uma mensagem primeiro. Esta é uma política da Meta/Instagram, não do GHL.

