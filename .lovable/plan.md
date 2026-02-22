

# Aumentar limite de perfis analisados para 500

## Situacao actual

O workspace `d9e3d0ae` (periodo Fevereiro 2026) tem:
- Perfis analisados: **200 de 200** (esgotado)
- Pesquisas: 7 de 50

Registo na tabela `professional_prospecting_usage`:
- ID: `8337756a-7184-4133-b36c-15c11dc3fc60`

## Alteracao

Executar um UPDATE na tabela `professional_prospecting_usage` para alterar `profiles_analyzed_limit` de 200 para **500** no registo do periodo actual.

```sql
UPDATE professional_prospecting_usage
SET profiles_analyzed_limit = 500, updated_at = now()
WHERE id = '8337756a-7184-4133-b36c-15c11dc3fc60';
```

Apos esta alteracao, o workspace tera 300 perfis disponiveis para analise (500 - 200 ja usados).

Nao e necessaria nenhuma alteracao de codigo.

