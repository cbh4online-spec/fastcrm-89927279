

# Corrigir Dominio nos Convites

## Problema

O campo `custom_domain` na tabela `store_settings` tem o valor `fast.metodopare.ai`, mas o dominio correto e `fastcrm.metodopare.ai`. Isto faz com que os links nos emails de convite apontem para um dominio que nao existe.

## Solucao

Atualizar o valor do `custom_domain` na base de dados:

```sql
UPDATE store_settings
SET custom_domain = 'fastcrm.metodopare.ai'
WHERE custom_domain = 'fast.metodopare.ai';
```

## Resultado

Os proximos convites enviados terao o link correto: `https://fastcrm.metodopare.ai/seller-invite?token=...`

Sem alteracoes de codigo necessarias.

