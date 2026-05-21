
# Importador SAF-T PT — Histórico de Vendas

## Diagnóstico

O SAF-T PT é um XML normalizado pela Portaria 302/2016 emitido por qualquer software certificado pela AT (PHC, Primavera, Sage, Moloni, Toconline, InvoiceXpress, etc.). Suporta três tipos relevantes:

- **Faturação** (mensal): `SourceDocuments` com `SalesInvoices`, `MovementOfGoods`, `WorkingDocuments`, `Payments`
- **Contabilidade** (anual): inclui `MasterFiles` completo + `GeneralLedgerEntries`
- **Autofaturação**: documentos emitidos pelo adquirente em nome do fornecedor

A app já tem `invoices`, `invoice_payments`, `contacts`, `companies`, `products` com regras de dedupe estritas por NIF (memória CRM) e KPIs financeiros baseados em `amount_paid` (memória Finance). O importador encaixa neste ecossistema sem criar tabelas paralelas.

## Decisões de Produto/UX

1. **Página dedicada** em `Definições → Importações → SAF-T PT` (e atalho em `Financeiro → Importar histórico`).
2. **Fluxo em 4 passos**: Upload → Análise (preview) → Mapeamento → Importação com progresso.
3. **Preview obrigatório** antes de confirmar: mostra período fiscal detectado, nº de docs novos vs já existentes, nº de clientes/produtos a criar vs merge, totais por tipo de documento.
4. **Dry-run** opcional: parsing completo sem escrita, só relatório.
5. **Histórico de importações** com possibilidade de ver log detalhado e (futuramente) reverter.
6. **Documentos importados marcados visualmente** com badge "SAF-T" e origem (nome do ficheiro + período).

## Estrutura Técnica

### Novas tabelas

```text
saft_imports
  ├─ id, workspace_id, uploaded_by
  ├─ file_name, file_hash (SHA-256 — dedupe global do ficheiro)
  ├─ file_size, storage_path
  ├─ saft_type ('billing' | 'accounting' | 'self_billing')
  ├─ saft_version, software_company, software_id
  ├─ tax_registration_number (NIF emissor)
  ├─ fiscal_year, period_start, period_end
  ├─ status ('uploaded'|'analyzing'|'preview_ready'|'importing'|'completed'|'failed')
  ├─ stats jsonb (counts por entidade)
  ├─ error_message, started_at, completed_at

saft_import_items
  ├─ id, import_id, workspace_id
  ├─ entity_type ('invoice'|'customer'|'product'|'payment')
  ├─ source_key (InvoiceNo, CustomerID, ProductCode, PaymentRefNo)
  ├─ source_hash (hash linha SAF-T para detectar mudanças)
  ├─ action ('created'|'updated'|'skipped_duplicate'|'merged'|'failed')
  ├─ target_id (FK polimórfica para invoices/contacts/companies/products)
  ├─ error_message, raw_payload jsonb
```

### Extensões a tabelas existentes (não-destrutivas)

```text
invoices
  + saft_import_id uuid null
  + saft_invoice_no text null      -- ex: "FT 2024/123"
  + saft_atcud text null            -- código único AT
  + saft_hash text null             -- hash do doc (idempotência)
  + UNIQUE (workspace_id, saft_invoice_no) WHERE saft_invoice_no IS NOT NULL

invoice_payments  + saft_import_id, saft_payment_ref
contacts          + saft_import_id
companies         + saft_import_id
products          + saft_import_id, saft_product_code
```

### Storage

Bucket privado `saft-imports/` (RLS por workspace). Ficheiros guardados para auditoria e re-processamento.

### Edge Functions

1. **`saft-analyze`** — recebe `import_id`, faz streaming parse do XML (sax-style para suportar 50 MB sem OOM), valida schema mínimo, extrai header + counts, popula preview em `saft_imports.stats`. Não escreve dados de negócio.
2. **`saft-import`** — recebe `import_id` + opções (criar produtos sim/não, etc.), executa importação em transações por bloco (clientes → produtos → faturas → pagamentos), com dedupe e logging por item em `saft_import_items`.

Ambas com CORS, JWT validation, workspace membership check, e padrão de resposta 200 OK com `{ ok, fallback?, error? }` (memória Edge Functions resilient).

### Parsing

Lib `fast-xml-parser` (Deno-compatible via npm:) com `parseAttributeValue` e streaming por nó para SAF-T grandes. Schema-aware: mapeia `InvoiceType` → `document_type` (FT, FS, FR, NC, ND, etc.), `PaymentMechanism` → `payment_method`.

### Dedupe (conforme escolhido)

- **Faturas**: chave única `(workspace_id, saft_invoice_no)` + `saft_hash`. Se hash igual → skip. Se diferente → reimporta apenas campos seguros (estado, valor pago) preservando histórico.
- **Clientes**: NIF é chave primária de dedupe (regra existente). Email como fallback. Sem NIF → procura por nome+email; senão cria.
- **Produtos**: `saft_product_code` por workspace. Fallback por nome exato.
- **Pagamentos**: `(workspace_id, saft_payment_ref)` único.

### Frontend

```text
src/pages/imports/SafTImportPage.tsx          (wizard 4 passos)
src/components/imports/saft/
  ├─ SafTUploader.tsx          (drag&drop, validação .xml, hash client-side)
  ├─ SafTPreviewPanel.tsx      (cards com contadores + tabela amostra)
  ├─ SafTMappingPanel.tsx      (opções: criar produtos, criar clientes, importar pagamentos)
  ├─ SafTProgressPanel.tsx     (polling status + log em tempo real)
  └─ SafTHistoryTable.tsx      (importações anteriores)
src/hooks/imports/
  ├─ useSafTUpload.ts
  ├─ useSafTAnalyze.ts
  ├─ useSafTImport.ts
  └─ useSafTImports.ts         (listagem)
```

Entrada no `routeManifest.ts` (SSoT) sob departamento Financeiro.

## Plano de Implementação

1. **Migração DB**: tabelas `saft_imports`, `saft_import_items`, colunas SAF-T nas tabelas existentes, índices únicos, RLS por workspace, bucket `saft-imports` + policies.
2. **Edge function `saft-analyze`** com streaming parser e validação de header AT.
3. **Edge function `saft-import`** com dedupe idempotente e logging por item.
4. **Frontend wizard** (upload → preview → mapping → progresso).
5. **Página de histórico** com drill-down para `saft_import_items`.
6. **Badge "SAF-T" + tooltip** nas faturas importadas (lista e detalhe).
7. **Integração no menu** (Financeiro + Definições/Importações).
8. **Memória do projecto**: criar `mem://features/imports/saft-pt` com regras de dedupe e mapeamento de tipos.

## Critérios de Aceitação

- Upload de SAF-T Faturação de 12 meses (PHC, Moloni, InvoiceXpress) é processado sem OOM até 50 MB.
- Re-upload do mesmo ficheiro: 0 docs criados, todos marcados `skipped_duplicate`.
- Upload de mês seguinte com 2 NCs sobre faturas anteriores: NCs criadas, faturas originais inalteradas.
- Clientes com mesmo NIF de contactos já existentes fazem merge sem duplicar.
- KPIs financeiros (`useFinancialKPIs`) refletem corretamente os valores importados (via `invoice_payments`).
- SAF-T Contabilidade detectado e parseado (mesmo que só importe `SalesInvoices`+`Payments` na v1 — `GeneralLedger` fica como TODO explícito).
- SAF-T mal formado devolve erro claro no preview (não rebenta a função).
- Importação cancelável durante o `importing` (flag em `saft_imports.status`).

## Riscos e Pontos a Validar

- **Encoding**: SAF-T pode vir em ISO-8859-1; garantir conversão para UTF-8 no upload.
- **Documentos anulados** (`InvoiceStatus = A`): importar como `status='cancelled'`, não somar a KPIs.
- **Documentos sem cliente** (vendas a "Consumidor Final" com NIF `999999990`): criar contacto genérico único por workspace.
- **NIFs estrangeiros** (prefixo país): manter como string, sem validação PT.
- **IVA isento** (motivos M01–M99): mapear `TaxExemptionReason` para campo dedicado.
- **Multi-empresa num único SAF-T**: validar `TaxRegistrationNumber` do header contra workspace; recusar se não bater certo.
- **Faturas de período já encerrado**: aviso visual mas permitir (caso de migração).
- **50 MB no Deno edge**: confirmar limite de memória; se preciso, fazer fallback para chunked parse em duas passagens (header primeiro, depois corpo).

## Fora de Âmbito (v1)

- `GeneralLedgerEntries` (movimentos contabilísticos analíticos)
- Reversão automática de uma importação (manual via SQL no início)
- Importação recorrente agendada (escolha do utilizador foi "manual ocasional")
- Background processing via Trigger.dev (não necessário ≤50 MB)
