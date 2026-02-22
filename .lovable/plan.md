
# Atribuir acesso ao modulo Estrategia para daniel.silva@metodopare.ai

## Diagnostico

O utilizador daniel.silva@metodopare.ai tem o role **admin** no workspace actual. O menu "Brief Executivo" (secao Estrategia) usa a chave `strategy` no sistema de permissoes de menu, mas **nao existem registos** na tabela `menu_permissions` para `menu_key = 'strategy'`.

Como o sistema retorna `can_access = false` por defeito quando nao encontra uma permissao para roles que nao sejam `owner`, o menu fica invisivel para este utilizador.

## Solucao

Inserir registos na tabela `menu_permissions` para a chave `strategy`, dando acesso ao role `admin` (e opcionalmente aos outros roles):

```sql
INSERT INTO menu_permissions (role, menu_key, can_access, can_edit)
VALUES ('admin', 'strategy', true, true);
```

Isto vai tornar a secao "Estrategia" visivel na barra lateral para o daniel.silva e todos os utilizadores com role `admin`.

Opcionalmente, tambem se pode adicionar acesso para outros roles (`agent`, `agency`, `viewer`) se desejado.

Nao e necessaria nenhuma alteracao de codigo.
