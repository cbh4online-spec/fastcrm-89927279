# Corrigir a moeda «Euro» nas faturas da METODOPARE

## O que muda
7 faturas da METODOPARE (173/FAC4, 175/FAC4, 176/FAC4, 177/FAC4, 2/FAC4, 3/FAC4 e um rascunho) têm a moeda escrita «Euro». Vão passar a «EUR». Os valores, estados e pagamentos não mudam.

Para não voltar a acontecer, qualquer fatura gravada no futuro com «Euro», «Euros» ou «€» passa automaticamente a «EUR».

## Detalhes técnicos
- Migração: `UPDATE invoices SET currency='EUR' WHERE currency IN ('Euro','Euros','€')`.
- Trigger `BEFORE INSERT OR UPDATE` em `invoices` que normaliza `currency` (trim + upper; Euro/Euros/€/vazio → EUR).
- A normalização que já existe na página da fatura mantém-se como proteção extra.

## Verificação
- Query: 0 faturas com moeda diferente de um código de 3 letras.
- Abrir a 175/FAC4 na METODOPARE e confirmar que aparece.
