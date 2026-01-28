
# Plano: Remover Configuração GHL Duplicada do METODOPARE

## Problema
O mesmo `location_id` (`GydyXmDssRSxHw7bQ7Cw`) está configurado em dois workspaces. O webhook processa o primeiro match, que é METODOPARE.

## Solução
Eliminar a configuração GHL do workspace METODOPARE, mantendo apenas a do PHARLISS.

---

## Acção Necessária

Executar um DELETE directo na base de dados para remover a configuração duplicada:

```sql
DELETE FROM workspace_ghl_config 
WHERE id = '2015d7a1-dcc1-4d3c-a3df-3c5003fb6265';
```

**Identificação do registo a eliminar:**
- **Config ID**: `2015d7a1-dcc1-4d3c-a3df-3c5003fb6265`
- **Workspace**: METODOPARE (`d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f`)
- **Location ID**: `GydyXmDssRSxHw7bQ7Cw`

**Registo que permanece:**
- **Config ID**: `21deb868-e34c-4b2f-8297-27c9d777b819`
- **Workspace**: PHARLISS (`0662fc16-6286-4156-a908-08c7dfec0fb7`)
- **Location ID**: `GydyXmDssRSxHw7bQ7Cw`

---

## Resultado Esperado

Após a eliminação:
1. O webhook GHL processará contactos apenas para PHARLISS
2. METODOPARE não terá integração GHL configurada
3. Os contactos criados no GoHighLevel aparecerão como leads em PHARLISS

---

## Execução

Esta é uma operação de dados (DELETE), não uma alteração de schema. Será executada usando a ferramenta de inserção/actualização de dados.

---

## Validação Pós-Execução

1. Verificar que apenas existe uma configuração GHL
2. Testar o webhook enviando um contacto de teste
3. Confirmar que o lead aparece em PHARLISS
