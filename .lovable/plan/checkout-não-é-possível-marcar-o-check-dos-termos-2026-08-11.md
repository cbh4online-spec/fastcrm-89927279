# Checkout: não é possível marcar o check dos Termos

## Diagnóstico (confirmado no código)

O checkbox "Li e aceito os Termos e Condições" é um input controlado:

- `CheckoutPaymentStep.tsx` recebe `acceptTerms` (default `false`) e `onAcceptTermsChange` (opcional).
- `StoreCheckoutPage.tsx` (linha 230) renderiza `CheckoutPaymentStep` **sem passar nenhuma destas props**.

Resultado: `checked` fica sempre `false` e o `onChange` não faz nada — a caixa não pode ser marcada e o botão "Pagar com Cartão" fica permanentemente desativado (`disabled={... || !acceptTerms}`). Nenhuma compra pode ser concluída na loja.

## Correção

1. Criar o estado `acceptTerms` em `StoreCheckoutPage.tsx` e passar `acceptTerms` + `onAcceptTermsChange` ao `CheckoutPaymentStep`.
2. Validar no submit: se não estiver aceite, mostrar o erro em `fieldErrors.acceptTerms` (mensagem já prevista no `checkoutSchema.ts`) em vez de bloquear silenciosamente.
3. Acessibilidade: associar o input ao texto via `id`/`htmlFor`, garantir foco visível e ativação por teclado (espaço).

## Notas técnicas

- Ficheiros: `src/pages/store/StoreCheckoutPage.tsx` (estado + props), `src/components/store/checkout/CheckoutPaymentStep.tsx` (apenas ids/acessibilidade).
- Sem alterações de dados, preços, RLS ou edge functions.

## Critérios de aceitação

- O check marca/desmarca com rato e teclado.
- Com o check marcado e email preenchido, o botão de pagamento fica ativo.
- Sem aceitação, o submit mostra mensagem de erro clara.
- Consola sem erros; validado a 390px e 1180px na rota `/store/ajax/checkout`.
