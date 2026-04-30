## Diagnóstico

O wizard de criação de produtos por OCR (`/dashboard/products/ocr-create`) faz duas chamadas IA pagas, mas **nenhuma delas debita a wallet de créditos do workspace**:

| Etapa | Edge function | `logAIUsage` (técnico) | `consume_funnel_credits` (wallet) |
|---|---|---|---|
| Passo 2 — Leitura OCR | `product-ocr-extract` | ✅ presente | ❌ **em falta** |
| Passo 4 — Geração de conteúdo | `product-ocr-generate-content` | ✅ presente | ❌ **em falta** |

Consequências:
- O utilizador pode gerar leituras e conteúdos AI ilimitadamente sem ver o saldo descer.
- Os relatórios de consumo no `credit_ledger` não refletem este fluxo (apenas o `ai_usage_logs` técnico tem o registo).
- Inconsistência face a outros fluxos (`useStrategicBriefs`, `useLandingPageCopy`, ebooks, etc.) que já fazem `consumeCredits.mutateAsync(...)` antes de invocar a função.

Regra existente na BD (já criada, **não** precisa migration):
- `ai_document_ocr` — 3 créditos — módulo `intelligence` — activa.

Falta a regra para a geração de conteúdo comercial (passo 4), que é uma chamada AI pesada (texto longo + argumentário). Proponho criar:
- `product_ocr_generate_content` — **5 créditos** — módulo `products`.

## Decisões de produto/UX

1. **Cobrar por acção, não por wizard inteiro**: o utilizador paga 3 créditos quando carrega em "Ler documento" e 5 créditos quando carrega em "Gerar conteúdo". Isto permite repetir só a etapa que falhou sem cobrar tudo de novo.
2. **Pré-validação de saldo**: antes de invocar a edge function, verificar `canAfford(actionKey)`. Se não tiver saldo, abrir o `GlobalNoCreditsDialog` (via `triggerNoCreditsDialog`) com label adequada e custo.
3. **Cobrar antes de invocar**: padrão idêntico a `useStrategicBriefs` — `await consumeCredits.mutateAsync(...)` primeiro; só se o débito tiver sucesso é que se chama a edge function. Se a edge function falhar depois, mostramos toast de erro mas o crédito já foi consumido (mesmo padrão dos restantes fluxos AI da app).
4. **Idempotência**: passar `idempotencyKey = ${doc.id}:extract` e `${doc.id}:generate-content` para evitar duplo débito em caso de duplo-clique ou retry.
5. **Referência rastreável**: `referenceType="product_ocr_document"`, `referenceId=doc.id` para auditoria no `credit_ledger`.
6. **Mostrar custo no botão**: textos passam a ser "Ler documento (3 créditos)" e "Gerar conteúdo (5 créditos)" para transparência.

## Estrutura técnica

### 1. Migration — nova regra de pricing
```sql
INSERT INTO public.credit_pricing_rules
  (action_key, label, description, credits_cost, module, category, is_active)
VALUES
  ('product_ocr_generate_content',
   'Geração de Conteúdo Comercial (OCR)',
   'Gera descrições, argumentário de venda e textos de catálogo a partir do documento OCR.',
   5, 'products', 'ai_generation', true)
ON CONFLICT (action_key) DO NOTHING;
```

### 2. `src/components/products/ocr/StepUpload.tsx` — débito antes da extração
- Importar `useCreditWallet` + `triggerNoCreditsDialog`.
- Em `runExtraction`:
  - obter `getCost('ai_document_ocr')` e `canAfford('ai_document_ocr')`;
  - se não pode, abrir dialog e abortar;
  - `await consumeCredits.mutateAsync({ actionKey: 'ai_document_ocr', idempotencyKey: \`${currentDoc.id}:extract\`, referenceType: 'product_ocr_document', referenceId: currentDoc.id });`
  - só depois `supabase.functions.invoke("product-ocr-extract", ...)`.
- Atualizar texto do botão para incluir o custo.

### 3. `src/pages/ProductOCRCreate.tsx` — débito antes da geração de conteúdo
- Em `generateContent` aplicar o mesmo padrão com `actionKey='product_ocr_generate_content'` e `idempotencyKey=\`${doc.id}:generate-content\``.
- Atualizar o botão correspondente (em `StepProductSheet` ou onde estiver a chamar `generateContent`) para mostrar o custo.

### 4. (Opcional, recomendado) — defesa em profundidade nas edge functions
Hoje a wallet só é validada no frontend. Para garantir que não passa por chamadas directas à edge function, podemos validar no servidor também:
- No início de `product-ocr-extract` e `product-ocr-generate-content`, chamar `consume_funnel_credits` com `service_role` se o frontend não enviou idempotency key, ou pelo menos verificar saldo. **Decisão**: deixar para uma segunda fase para não alargar o âmbito; o padrão actual da app é débito client-side e é consistente.

## Plano de implementação

1. Criar migration com a regra `product_ocr_generate_content` (5 créditos).
2. Editar `StepUpload.tsx` — guard + débito + label do botão.
3. Editar `ProductOCRCreate.tsx` (`generateContent`) — guard + débito + label do botão.
4. Ajustar o componente que renderiza o botão "Gerar conteúdo" para receber o custo.
5. QA manual:
   - Saldo suficiente: ler doc → saldo desce 3, gerar conteúdo → saldo desce 5, `credit_ledger` mostra duas entradas com `reference_id = doc.id`.
   - Saldo insuficiente: dialog "Sem créditos" abre, edge function não é chamada (verificar Network).
   - Duplo-clique: idempotencyKey impede segundo débito.
   - Falha da edge function após débito: toast de erro, crédito permanece debitado (consistente com restantes fluxos).

## Critérios de aceitação

- [ ] Carregar em "Ler documento" debita 3 créditos visíveis na wallet.
- [ ] Carregar em "Gerar conteúdo" debita 5 créditos visíveis na wallet.
- [ ] Sem saldo, ambos os botões abrem o dialog de compra de créditos e não invocam a edge function.
- [ ] `credit_ledger` regista as transações com `module`, `action_key`, `reference_type='product_ocr_document'`, `reference_id`.
- [ ] Repetir a mesma acção no mesmo documento (mesmo idempotency key) não duplica o débito.
- [ ] Botões mostram o custo em créditos.

## Riscos e pontos por validar

- **Custo de 5 créditos para geração de conteúdo**: confirmar com o utilizador se concorda ou prefere outro valor (3? 4? 6?).
- **Cobrança antes vs. depois da chamada AI**: padrão actual da app é "antes". Se a IA falhar o crédito não é estornado. Aceitável?
- **Defesa server-side (edge function)**: deixada para segunda fase. Confirma?
