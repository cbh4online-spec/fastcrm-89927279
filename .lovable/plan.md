## Diagnóstico

Ao clicar em **"Criar Produto em Rascunho"** no passo 6 do wizard OCR, o INSERT na tabela `products` falha silenciosamente (toast de erro genérico).

Causa raíz confirmada via inspeção do schema da BD:

```
products_status_check: CHECK (status = ANY (ARRAY['active','archived']))
```

O código em `src/pages/ProductOCRCreate.tsx` (linha 194) envia `status: "draft"`, mas a tabela `products` só aceita `active` ou `archived`. Resultado: violação de check constraint → INSERT rejeitado → erro Postgres devolvido ao cliente → toast "Erro ao criar produto".

Não existe nenhuma coluna ou flag dedicada a "rascunho" na tabela `products`. O conceito de rascunho do wizard OCR precisa de um mapeamento próprio.

## Decisões de produto

- O wizard OCR deve poder criar produtos **não publicados, em revisão**, sem violar o schema atual.
- Não vale a pena alterar o `products_status_check` (afeta toda a aplicação). Em vez disso, mapear o conceito "rascunho OCR" às flags de visibilidade já existentes:
  - `status = 'active'` (obrigatório pelo schema)
  - `store_published = false`
  - `b2b_published = false`
  - `b2b_visible = false`
  - `sheet_published = false`
  - Sinalizar a origem/estado de revisão via `metadata.ocr_draft = true` e via `pending_fields` (já populado).
- Assim o produto fica criado, **invisível em todas as lojas/canais**, e aparece nas listas internas como "a aguardar revisão" sem expor ao cliente final.

## Plano de implementação

### 1. `src/pages/ProductOCRCreate.tsx` — corrigir INSERT em `products`
- Substituir `status: "draft"` por `status: "active"`.
- Acrescentar flags de não publicação:
  - `store_published: false`, `b2b_published: false`, `b2b_visible: false`, `sheet_published: false`.
- Marcar `metadata.ocr_draft = true` e `metadata.review_required = pendingFields.length > 0` para distinguir nas listagens.
- Garantir que `tax_rate_estimate_pct` respeita o intervalo 0–100 (já temos parse, mas adicionar clamp defensivo).

### 2. Tratamento de erro mais informativo
- No `catch`, fazer `console.error` com o objeto Postgres completo (`code`, `message`, `details`, `hint`).
- Toast deve mostrar `e.message` em vez de string genérica quando disponível (já parcialmente feito), e adicionar fallback com `details/hint`.

### 3. Redirecionamento pós-criação
- Manter navegação para `/dashboard/products`, mas adicionar `?highlight=<id>&filter=ocr_draft` para o utilizador encontrar o produto recém-criado (não bloquear o fix se a página de listagem ainda não suportar — apenas query string informativa).

### 4. QA
- Criar produto a partir do wizard com EAN único e confirmar que aparece em `/dashboard/products` como inativo na loja.
- Confirmar que `product_content`, `product_sales_support`, `product_validation_tasks` ficam ligados ao novo `product_id`.
- Confirmar que `product_ocr_documents.product_id` fica preenchido.
- Repetir com EAN duplicado → deve mostrar mensagem de duplicação.
- Repetir sem PVP/Custo/IVA/Stock → produto criado + tarefas de validação pendentes geradas.

## Critérios de aceitação

- Carregar documento → wizard até passo 6 → "Criar Produto" → produto criado sem erro.
- Produto não fica visível em B2C/B2B/site sheet (todas as flags publish a `false`).
- Toast de sucesso e navegação para `/dashboard/products`.
- Em caso de erro real, mensagem clara em vez de "Erro ao criar produto".

## Riscos / por validar

- Se o utilizador esperar literalmente um estado `draft` visível na UI das listagens, será necessário num passo seguinte (fora deste fix) introduzir uma coluna `lifecycle_state` ou alargar o enum `status`. Para já, o filtro por `metadata->>'ocr_draft' = 'true'` cobre o caso.
- `tax_rate_estimate_pct` tem CHECK 0–100; valores fora do intervalo (raros mas possíveis no OCR) provocariam novo erro — adicionamos clamp.
