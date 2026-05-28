
# Importador de Extrato ARTSOFT no Módulo de Cobranças

## Objectivo
Permitir upload recorrente do PDF "Extrato de Clientes C/C — Documentos por saldar" (ARTSOFT) e:
1. Identificar clientes pelo Nº ARTSOFT (chave estável).
2. Criar/atualizar faturas reais em `invoices`.
3. Abrir/atualizar `collection_cases` por devedor.
4. Reconciliar saldos: faturas pagas/canceladas fora do PDF são marcadas como saldadas.

## Diagnóstico
- PDF ARTSOFT v26.0, formato `combit List & Label`, texto extraível com `pdftotext -layout`.
- Estrutura: cabeçalho de cliente (`Nº: Nome > Morada > … > CP LOCAL` + linha opcional `> Email:`), seguido de linhas de documento (`Nº · Conta · Tipo · NºDoc · NºDocTerceiro · DataDoc · DataVenc · Total · Saldo · Acumulado · …`).
- Doctypes: `A100-Fatura PT`, `B200-Nota de Crédito PT`, `A105-Documentos de Anos Anteriores`, etc.
- Página de rodapé com "A transportar" / "Transporte" / "Pág. N" — ignorar.

## Decisões de produto
- **Origem**: criar registos reais em `public.invoices` (dedupe por `external_ref` = `ARTSOFT:<numero_doc>`).
- **Matching**: 1 — `companies.external_ref = ARTSOFT:<nº cliente>`; 2 — `contacts.external_ref = ARTSOFT:<nº cliente>`; fallback — pedir mapeamento manual no wizard (passo "Por mapear").
- **Periodicidade**: importação manual recorrente (semanal/mensal), com tabela de histórico e dedupe por hash do ficheiro + por `external_ref` de fatura.
- **Reconciliação**: faturas com `external_ref ARTSOFT:*` que **não** apareçam no novo PDF → marcadas como `paid` (saldo zero), com `amount_paid = total` e nota auto.

## Estrutura técnica

### Database
- Adicionar coluna `external_ref TEXT` a `companies`, `contacts`, `invoices` (idx único parcial por workspace).
- Nova tabela `collection_imports` (histórico): `id, workspace_id, file_name, file_hash, source ('artsoft'), uploaded_by, status (uploaded|parsed|review|importing|completed|failed), stats jsonb, error_message, created_at, updated_at`.
- Nova tabela `collection_import_items` (staging por linha): `id, import_id, workspace_id, raw jsonb (cliente_no, name, address, email, tax_id, doc_type, doc_no, third_no, doc_date, due_date, total, balance), entity_type, matched_company_id, matched_contact_id, matched_invoice_id, action ('create_invoice'|'update_invoice'|'skipped'|'failed'|'needs_mapping'), error_message`.
- RLS por workspace_id; GRANTs autenticados + service_role.

### Edge functions
- `collections-import-parse` — recebe `import_id`, descarrega PDF do Storage, faz parse (regex linha por linha), preenche `collection_import_items`, tenta matching automático por `external_ref`. Resposta `200 OK + queued:true`; trabalho via `EdgeRuntime.waitUntil` (PDFs grandes).
- `collections-import-apply` — recebe `import_id` + opções (`auto_create_company`, `auto_close_missing`). Cria/atualiza `companies/contacts/invoices`, abre/atualiza `collection_cases` e respectivas `collection_case_invoices`; marca faturas em falta como pagas; atualiza `collection_imports.stats`.

### Frontend
- Página `/dashboard/cobrancas/import` (rota nova em `CRMRoutes` / colecções) com 5 passos: Upload → Análise → Por mapear (clientes novos → ligar a empresa/contacto existente ou criar) → Preview (totais por ação) → Aplicar + Progresso.
- Tabela de histórico de importações com retry/delete (padrão SAF-T).
- Link "Importar extrato" no topo de `CollectionsInboxPage`.

### Storage
- Bucket privado `collections-imports/<workspace_id>/<import_id>.pdf` com RLS por workspace.

## Plano de implementação
1. Migração: colunas `external_ref`, tabelas `collection_imports` / `collection_import_items`, bucket, RLS, GRANTs.
2. Edge `collections-import-parse` (parser ARTSOFT + auto-matching).
3. Edge `collections-import-apply` (criação faturas, casos, reconciliação).
4. Hooks React (`useCollectionImports`, `useCollectionImportItems`, `useApplyCollectionImport`).
5. UI Wizard (`/dashboard/cobrancas/import`) + tabela histórico.
6. Botão "Importar extrato" em `CollectionsInboxPage`.
7. QA com este PDF (15.05.2026): contar clientes, validar totais por cliente, confirmar abertura de casos.

## Critérios de aceitação
- Upload do PDF → identifica >90% dos clientes automaticamente quando já têm `external_ref`.
- Clientes novos surgem em "Por mapear" antes de qualquer escrita.
- Cada fatura ARTSOFT criada uma única vez (dedupe `external_ref`).
- Reimportar o mesmo ficheiro não duplica registos.
- Casos de cobrança refletem `total_due`, `oldest_due_date`, `days_overdue` calculados a partir das faturas.
- Faturas removidas do extrato seguinte → marcadas pagas e caso encerrado se saldo = 0.

## Riscos / por validar
- NIF não aparece no PDF — matching só por Nº cliente ARTSOFT + nome; primeira importação obriga mapeamento manual.
- Texto multi-linha em moradas longas pode partir o regex — testar com este PDF e endurecer parser.
- Coluna `external_ref` pode já existir noutro contexto — verificar antes de migrar.
- Quantidade de faturas por importação pode exceder limite CPU da edge function → usar `EdgeRuntime.waitUntil` + chunking (200 linhas/lote).
