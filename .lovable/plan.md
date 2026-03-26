

## Problema

O segredo `EVOLUTION_API_URL` continua a conter a connection string do PostgreSQL do Railway (algo como `postgresql://postgres:...@...railway.app:5432/railway`) em vez da URL HTTP da Evolution API.

Apesar de termos tentado atualizar o segredo várias vezes, o valor persistido continua errado. Os logs confirmam: `Url scheme 'postgresql' not supported`.

## Plano

### 1. Atualizar o segredo `EVOLUTION_API_URL`
Definir o valor correto: `https://evolution-api-production-e886.up.railway.app`

### 2. Redeployar a edge function
Forçar o redeploy da `whatsapp-qr-connect` para garantir que usa o novo valor do segredo e inclui a validação de URL já adicionada ao código.

### 3. Testar
Invocar a edge function para confirmar que o erro `postgresql scheme` desapareceu.

---

**Nota técnica**: O código da edge function já inclui validação que rejeita URLs não-HTTP com mensagem clara. Basta corrigir o segredo.

