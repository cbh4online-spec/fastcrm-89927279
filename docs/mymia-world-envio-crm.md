# mymia.world → FastCRM (contactos + conversas)

Mesmo modelo usado a 17 de setembro para produtos/imagens: o mymia.world envia,
o FastCRM recebe, autenticação por token simples.

## Variáveis a configurar no mymia.world

| Nome | Valor |
| --- | --- |
| `FASTCRM_CRM_URL` | `https://eumnfkccyvlyoyjchiwe.supabase.co/functions/v1/mymia-crm-sync` |
| `FASTCRM_CRM_TOKEN` | (token gerado no FastCRM — entregue no chat) |

## Formato do envio

`POST {FASTCRM_CRM_URL}` com `Authorization: Bearer {FASTCRM_CRM_TOKEN}`:

```json
{
  "workspace_id": "430c7917-8398-4c71-9c2d-d39389ad04e5",
  "mode": "apply",
  "leads": [
    {
      "external_id": "<id do crm_leads>",
      "nome": "Nome do contacto",
      "email": "email@exemplo.pt",
      "telefone": "+351912345678",
      "estado": "novo",
      "origem": "landing",
      "empresa": "Clínica X",
      "notas": "texto livre",
      "valor_estimado_cents": 12000,
      "updated_at": "2026-09-24T01:00:00.000Z",
      "conversas": [
        {
          "external_conversation_id": "<id da conversa>",
          "canal": "whatsapp",
          "telefone": "+351912345678",
          "contacto_nome": "Nome do contacto",
          "ultima_mensagem_em": "2026-09-23T18:20:00.000Z",
          "mensagens": [
            {
              "external_message_id": "<id da mensagem>",
              "direcao": "inbound",
              "texto": "Boa tarde, queria informações",
              "tipo": "text",
              "criado_em": "2026-09-23T18:20:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

Notas:
- `mode: "preview"` valida sem gravar nada.
- Máximo de 500 contactos por envio, 20 conversas por contacto, 200 mensagens por conversa.
- Idempotente: contactos por `external_id`, conversas e mensagens pelos respetivos ids externos.
- Contactos sem email nem telefone são ignorados.
