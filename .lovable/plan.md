
# Suporte a Webhooks em Tempo Real do GHL

## Situação Atual

A infraestrutura de webhooks **já existe e funciona**:
- `ghl-webhook-message` — processa mensagens inbound em tempo real
- `ghl-webhook-contact` — processa novos contactos
- As URLs são exibidas na secção "URLs dos Webhooks" nas configurações

O que **falta** é:
1. Instruções claras e passo a passo de como configurar o webhook no painel do GHL
2. Indicação de qual evento GHL usar (`InboundMessage`)
3. O URL atual não inclui o `location_id` como query param — sem ele, o webhook falha para workspaces que tenham múltiplos location IDs
4. Um teste de verificação de webhook diretamente nas configurações (botão "Testar Webhook")

---

## Solução

### 1. Melhorar a UI de Configuração de Webhooks (`WorkspaceGHLSettings.tsx`)

**A. URL com Location ID pré-preenchido**

Em vez de o utilizador ter de configurar o header `X-GHL-Location-Id` (complexo), o URL do webhook já inclui o location_id como query param — muito mais simples de configurar no GHL:

```
https://...functions/v1/ghl-webhook-message?location_id=SEU_LOCATION_ID
```

O `ghl-webhook-message` já suporta `location_id` como query param (linha 97 do ficheiro).

**B. Guia passo a passo expansível**

Adicionar um `Accordion` com instruções visuais de como configurar o webhook no GHL:

```
Passo 1: No GHL, abra Settings → Integrations → Webhooks
Passo 2: Clique em "Add New Webhook"
Passo 3: Cole o URL de mensagens (já com location_id)
Passo 4: Selecione o evento: "InboundMessage"
Passo 5: Guarde e ative o webhook
```

**C. Botão "Testar Webhook"**

Um botão que faz uma chamada de teste ao `ghl-webhook-message` com um payload simulado, mostrando se a configuração está correta.

**D. Estado de Webhook Ativo/Inativo**

Mostrar quando a última mensagem foi recebida via webhook vs. via polling, para o utilizador saber qual método está a funcionar.

---

### 2. Atualizar o Alerta de Headers

O alerta atual mostra headers obrigatórios que são necessários apenas se não usar o query param. Com o URL atualizado (que já inclui `location_id`), o utilizador só precisa de:
- Colar o URL
- Selecionar o evento `InboundMessage`

---

## Ficheiros a Alterar

| Ficheiro | Ação |
|---|---|
| `src/components/settings/sections/WorkspaceGHLSettings.tsx` | Atualizar URL com location_id, adicionar guia passo a passo, botão de teste, melhorar secção de webhooks |

## Technical Details

- O `ghl-webhook-message` já lê `location_id` do query param na linha 97: `url.searchParams.get("location_id")` — nenhuma alteração à edge function necessária.
- O `ghl-webhook-contact` também já suporta `location_id` como query param (linha 67) — mesmo padrão.
- O botão "Testar Webhook" fará um `fetch` direto ao endpoint com um payload mínimo de teste, verificando se retorna 200.
- Nenhuma alteração à base de dados ou RLS necessária.
- A lógica de deduplicação por `ghl_message_id` continua intacta — não há risco de duplicados.
- O cron de polling pode coexistir com webhooks em tempo real — os webhooks chegam imediatamente, o cron serve de fallback para mensagens que possam ter escapado.
