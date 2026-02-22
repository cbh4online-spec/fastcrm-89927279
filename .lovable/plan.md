

# Correcao: Perfis nao saem da lista apos envio no Bulk Outreach

## Problema identificado

Os leads estao a ser criados na base de dados com sucesso (confirmado: "Ines Trovao" e "Nutrition Academy" existem na tabela `leads`). O problema e que os perfis nao sao removidos da lista de resultados porque:

1. A query de resultados filtra por `status = "analyzed"` (linha 151 de ProspectingResults)
2. O fluxo manual de conversao atualiza o perfil para `status = "converted"` e define `converted_lead_id` (linhas 307-313)
3. O `BulkOutreachDialog.handleConfirmSent` so atualiza `outreach_step = 1` -- NAO muda o `status` nem define o `converted_lead_id`
4. Como o perfil continua com `status = "analyzed"`, permanece na lista

## Solucao

### Ficheiro: `BulkOutreachDialog.tsx`

Na funcao `handleConfirmSent`, depois de criar o lead e obter o seu ID:

1. Atualizar o perfil de prospeccao com `status = "converted"`, `converted_lead_id`, `converted_at` e `converted_by` (igual ao fluxo manual)
2. Invalidar a query `["prospecting-profiles"]` para que a lista atualize imediatamente

### Alteracoes especificas

1. Alterar o insert de lead para usar `.select().single()` e obter o ID do lead criado
2. Apos criar o lead, atualizar o perfil:
   - `status: "converted"`
   - `converted_lead_id: lead.id`
   - `converted_at: new Date().toISOString()`
   - `converted_by: userId`
3. Importar `useQueryClient` e chamar `invalidateQueries` apos cada confirmacao de envio para atualizar a lista em tempo real

### Resumo

| Ficheiro | Alteracao |
|---|---|
| `BulkOutreachDialog.tsx` | Atualizar perfil para `status: "converted"` apos criar lead; invalidar queries para remover da lista |

