

# Configurar secret APP_URL

## O que será feito
Adicionar o secret `APP_URL` com o valor `https://fastcrm.metodopare.ai` ao projeto.

Este secret é usado pelas edge functions `meta-oauth-callback` e `instagram-oauth-callback` para redirecionar os utilizadores de volta à aplicação após o OAuth.

## Passo técnico
- Usar a ferramenta `add_secret` para criar o secret:
  - **Nome:** `APP_URL`
  - **Valor:** `https://fastcrm.metodopare.ai`

Os fallbacks hardcoded já foram atualizados na mensagem anterior, por isso este secret serve como configuração adicional para flexibilidade futura.

