

# Fix: Erro "Permission denied" ao desconectar email

## Problema
A edge function `email-disconnect` foi editada anteriormente para aceitar o role `"member"`, mas **nunca foi reimplantada**. A versão em produção ainda é a antiga, que só aceita `"owner"` e `"admin"`.

O log confirma: `Error: Permission denied` na linha 39 — correspondente à versão antiga do ficheiro.

## Solução

**Uma única ação**: reimplantar a edge function `email-disconnect`.

Não há alterações de código necessárias — o ficheiro já está correto com `["owner", "admin", "member"]` na linha 53.

### Ficheiros
Nenhum ficheiro alterado. Apenas deploy da função existente.

