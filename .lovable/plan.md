

## Problema

O segredo `EVOLUTION_API_URL` continua com o valor errado — contém a API key (`bd973abbc8e63695...`) em vez da URL (`https://evolution-api-production-e886.up.railway.app`). Os logs mais recentes (11:30:43Z) confirmam:

```
Invalid URL: 'bd973abbc8e63695.../instance/connect/ws_...'
```

## Plano

### 1. Corrigir o segredo `EVOLUTION_API_URL`
Atualizar para o valor correto: `https://evolution-api-production-e886.up.railway.app`

### 2. Verificar se os dois segredos estão corretos
- `EVOLUTION_API_URL` → `https://evolution-api-production-e886.up.railway.app` (URL da API)
- `EVOLUTION_API_KEY` → a API key configurada no Railway (o valor `bd973abbc8e63695...` que está atualmente no URL)

É provável que os valores dos dois segredos estejam **trocados** — a key no campo URL e vice-versa.

### 3. Testar a conexão
Após corrigir, testar o fluxo de QR Code no painel WhatsApp.

---

**Detalhe técnico**: Nenhuma alteração de código é necessária. O edge function está correto — o problema é apenas configuração de segredos.

