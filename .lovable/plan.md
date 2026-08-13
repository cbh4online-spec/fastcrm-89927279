# Corrigir erro do checkout: "Edge Function returned a non-2xx status code"

## Diagnóstico (confirmado)
- A função `checkout-create-session` lê a chave Stripe da tabela `workspace_stripe_config` (filtrando `is_active = true`).
- Consulta à base de dados: a tabela **não tem nenhuma linha**. Logo, a função lança `Stripe not configured for this workspace` e devolve **HTTP 400** — é isto que o frontend mostra como "Edge Function returned a non-2xx status code".
- O projeto já tem o secret global **STRIPE_SECRET_KEY** configurado, mas a função nunca o usa.
- Além disso, o erro real ("Stripe não configurado") nunca chega ao utilizador: o frontend mostra apenas a mensagem genérica do cliente Supabase.

## O que vai ser feito

1. **Fallback para a chave global do Stripe**
   - Em `supabase/functions/checkout-create-session/index.ts`: se não existir configuração ativa em `workspace_stripe_config`, usar `Deno.env.get("STRIPE_SECRET_KEY")`.
   - Só falhar se também não existir o secret global, com mensagem explícita.
   - Aplicar o mesmo fallback nas funções irmãs do funil que sofram do mesmo padrão (upsell/downsell e webhook), para não partir o passo seguinte.

2. **Erros legíveis no frontend**
   - A função passa a devolver `{ error, code }` com códigos estáveis (`stripe_not_configured`, `funnel_without_products`, `invalid_payload`).
   - No `CheckoutPage`, ler o corpo da resposta de erro (`FunctionsHttpError.context.json()`) e mostrar a mensagem real em toast, em vez do texto genérico.

3. **Aviso no backoffice**
   - No detalhe do funil, mostrar um alerta quando não houver Stripe configurado para o workspace, com nota de que está a ser usada a chave global.

## Detalhes técnicos
- Sem alterações de schema; nenhuma migração necessária.
- A chave continua a ser lida apenas server-side; nada é exposto ao cliente.
- Manter `corsHeaders` em todas as respostas, incluindo erros.

## Critérios de aceitação
- "Finalizar Compra" no funil `Teste funil` cria a sessão e redireciona para o Stripe.
- Se faltar configuração, o utilizador vê uma mensagem clara em português em vez do erro genérico.
- Nenhum erro na consola do browser durante o fluxo.

## Por validar
- Confirmar que a `STRIPE_SECRET_KEY` global corresponde à conta Stripe que deve receber estes pagamentos. Se cada workspace precisar da sua própria conta, o passo seguinte é criar o ecrã de configuração de Stripe por workspace (`workspace_stripe_config`) — diz se queres isso já nesta fase.
