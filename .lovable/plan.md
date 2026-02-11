
# Limpar Convites Duplicados da Base de Dados

## Problema

Existem 7 registos na base de dados para apenas 2 pessoas:
- **Jorge Cardoso**: 4 registos (2 pendentes, 2 revogados)
- **Strongadget**: 3 registos (1 pendente, 2 revogados)

## Solucao

Executar uma migracao SQL para eliminar os registos antigos, mantendo apenas o convite mais recente (pendente) de cada email:

### Registos a manter:
- `jorge.cardoso@digital4ads.pt` - o pendente mais recente (56cd78c0)
- `strongadget@gmail.com` - o pendente mais recente (fc4a1948)

### Registos a eliminar (5):
- Jorge Cardoso: 1 pendente duplicado + 2 revogados
- Strongadget: 2 revogados

### SQL

```sql
DELETE FROM c2c_seller_invites
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM c2c_seller_invites
  ORDER BY email, created_at DESC
);
```

Esta query mantem apenas o registo mais recente por email e elimina todos os outros.

### Resultado final
- Convites (2): Strongadget (Pendente), Jorge Cardoso (Pendente)

### Sem alteracoes de codigo
A deduplicacao no frontend ja esta implementada como salvaguarda para o futuro. Esta limpeza garante que a base de dados tambem fica consistente.
