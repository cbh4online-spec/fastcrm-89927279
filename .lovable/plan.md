
# Corrigir Reenvio de Convites (Problema Recorrente)

## Problema

Cada vez que se clica "Reenviar", o sistema revoga o convite antigo e cria um novo registo na base de dados. Isto faz com que os duplicados voltem a aparecer. A deduplicacao no frontend so mostra o mais recente, mas nao esta a funcionar corretamente porque ha um breve momento apos o reenvio em que ambos aparecem, e o contador mostra o total errado.

## Solucao

### 1. Alterar o hook `useResendSellerInvite` para ELIMINAR o antigo

Em vez de apenas mudar o status para "revoked" (que mantem o registo na base de dados), o reenvio vai **eliminar** o convite antigo antes de criar o novo. Assim nunca existem dois registos para o mesmo email.

**Ficheiro: `src/hooks/useC2CSellerInvites.ts`**

Alterar a funcao `useResendSellerInvite`:
- Substituir `.update({ status: "revoked" })` por `.delete().eq("id", invite.id)`
- Resultado: apos reenviar, existe apenas 1 registo por email na base de dados

### 2. Limpar os duplicados atuais

Executar SQL para eliminar o registo revogado do Strongadget (id: `fc4a1948-62c2-4715-afec-d59fab3d5914`), mantendo apenas o pendente mais recente.

```sql
DELETE FROM c2c_seller_invites
WHERE id NOT IN (
  SELECT DISTINCT ON (email) id
  FROM c2c_seller_invites
  ORDER BY email, created_at DESC
);
```

### Resultado

- Reenviar nunca cria duplicados - elimina o antigo e cria um novo
- A deduplicacao no frontend continua como salvaguarda extra
- A base de dados fica sempre limpa com 1 registo por pessoa
