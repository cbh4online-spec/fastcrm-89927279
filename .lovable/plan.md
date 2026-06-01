
# Módulo Renting / Financiamento

## Diagnóstico

A Liquid atua como **financiadora**: o cliente final contrata renting connosco, mas a fatura real (recebível) é emitida à Liquid. Precisamos:
1. Saber sempre **quem é o cliente final** que está a usar o equipamento, mesmo que a fatura seja à Liquid.
2. Rastrear **cada unidade física** (MyMia, tricoscópio) por nº de série, ao longo da vida do contrato.
3. Gerir o **ciclo de vida do contrato** (início, fim, renovação, devolução, avaria).

## Decisões de produto/UX

- **Novo módulo** no menu lateral: `Renting / Financiamento` (ícone Landmark).
- **Liquid** é uma entidade de tipo "Parceiro Financeiro" (reaproveitar `companies` com tag/role `financial_partner`). Multi-parceiro desde o início (amanhã pode haver outras financeiras).
- **Contrato** é o objeto central. A fatura à Liquid e a nota ao cliente final geram-se **a partir do contrato**, não o contrário.
- **Parque instalado** é uma vista transversal: lista todos os equipamentos com nº de série, onde estão, em que contrato.
- Cada cliente final no CRM ganha uma tab "Renting" com os seus contratos ativos.

## Estrutura técnica

### Tabelas novas (Supabase)

```text
rental_contracts
  ├─ id, workspace_id, contract_number (auto: RNT-2026-0001)
  ├─ end_client_company_id   → companies (cliente final que USA)
  ├─ end_client_contact_id   → contacts (opcional)
  ├─ financier_company_id    → companies (Liquid; role=financial_partner)
  ├─ status: draft | active | ended | renewed | cancelled | defaulted
  ├─ start_date, end_date, duration_months (ex: 36)
  ├─ monthly_amount, total_financed, financier_commission
  ├─ currency, notes
  ├─ liquid_invoice_id        → invoices (fatura emitida à Liquid)
  ├─ client_note_id           → invoices (nota/proforma ao cliente final, document_type='proforma')
  └─ created_by, created_at, updated_at

rental_contract_items
  ├─ id, contract_id, product_id, description
  ├─ quantity, unit_price, total
  └─ position

equipment_units                  ← parque instalado (asset tracking)
  ├─ id, workspace_id
  ├─ product_id                  → produto base (MyMia, Tricoscópio…)
  ├─ serial_number (UNIQUE por workspace)
  ├─ status: in_stock | assigned | returned | broken | retired
  ├─ current_contract_id         → rental_contracts (nullable)
  ├─ current_client_company_id   → companies (cliente que tem o equipamento)
  ├─ assigned_at, returned_at
  ├─ purchase_date, warranty_end_date
  ├─ notes
  └─ created_at, updated_at

equipment_unit_history           ← histórico de eventos
  ├─ id, equipment_unit_id
  ├─ event_type: assigned | returned | invoiced | broken | repaired | retired
  ├─ contract_id (nullable), invoice_id (nullable)
  ├─ from_client_id, to_client_id
  ├─ payload jsonb, occurred_at, actor_user_id

rental_contract_events           ← timeline do contrato
  ├─ id, contract_id, event_type, payload jsonb
  ├─ actor_user_id, occurred_at
```

### Alterações em tabelas existentes

- `invoice_items`: adicionar coluna `serial_numbers text[]` (array de nºs de série da linha).
- `invoices`: adicionar `rental_contract_id uuid nullable` (FK), permite distinguir faturas de renting das normais.
- `companies`: usar campo `tags` já existente para marcar `financial_partner` (sem migration de schema).

### RLS

- Todas as tabelas novas com RLS escopada por `workspace_id` (membros do workspace via `is_workspace_member`).
- `equipment_units.serial_number` UNIQUE `(workspace_id, serial_number)` — impede duplicados.

### Rotas e ficheiros frontend

```text
/dashboard/rentals                       → lista de contratos
/dashboard/rentals/new                   → wizard de criação
/dashboard/rentals/:id                   → detalhe (tabs: Resumo, Equipamentos, Faturas, Timeline)
/dashboard/rentals/equipment             → parque instalado (todos os nºs de série)
/dashboard/rentals/equipment/:id         → ficha do equipamento

src/modules/rentals/
  ├─ pages/RentalsListPage.tsx
  ├─ pages/RentalContractDetailPage.tsx
  ├─ pages/RentalContractNewPage.tsx
  ├─ pages/EquipmentInventoryPage.tsx
  ├─ pages/EquipmentUnitDetailPage.tsx
  ├─ components/RentalContractForm.tsx
  ├─ components/RentalItemsEditor.tsx     (linhas + nºs de série inline)
  ├─ components/SerialNumberInput.tsx     (chip input, valida duplicados)
  ├─ components/EquipmentStatusBadge.tsx
  ├─ components/RentalTimeline.tsx
  ├─ hooks/useRentalContracts.ts
  ├─ hooks/useEquipmentUnits.ts
  ├─ hooks/useCreateRentalContract.ts
  └─ lib/rentalNumbering.ts                (gera RNT-AAAA-NNNN via RPC)
```

### Fluxo de criação do contrato

1. **Wizard em 3 passos**:
   - **1. Partes**: cliente final (autocomplete `companies`) + financiadora (default: Liquid se existir).
   - **2. Equipamento e prazo**: linhas (produto, qtd, preço unit.), prazo (meses), data início, renda mensal (auto: total / meses). Para cada unidade pede-se o nº de série (chip input).
   - **3. Faturação**: revisão. Opção "Emitir fatura à Liquid agora" + "Gerar nota ao cliente final".
2. Ao confirmar:
   - Cria `rental_contracts` + `rental_contract_items`.
   - Para cada nº de série, faz **upsert** em `equipment_units` (cria se não existe, atualiza `current_contract_id`, `current_client_company_id`, `status='assigned'`). Regista evento em `equipment_unit_history`.
   - Se "emitir fatura à Liquid": cria `invoice` (`document_type='invoice'`, `client_*` da Liquid, `rental_contract_id` setado, linhas com `serial_numbers`). Atualiza `rental_contracts.liquid_invoice_id`.
   - Se "nota ao cliente": cria `invoice` (`document_type='proforma'`, dados do cliente final, `rental_contract_id` setado, marca claramente "Documento informativo — pagamento via Liquid"). Atualiza `rental_contracts.client_note_id`.
   - Regista `rental_contract_events` (`created`, `invoiced_financier`, `note_issued_client`).

### Edge function

- `rental-contract-create` — operação transacional (cria contrato + itens + equipment_units + 2 faturas). Garante consistência. Usa service_role com verificação de `workspace_members` + capability `rentals.manage`.

### Capabilities (RBAC)

Adicionar em `src/lib/permissions/capabilities.ts` e espelhar em `supabase/functions/_shared/capabilities.ts`:
- `rentals.view` — owner, admin, finance, sales
- `rentals.manage` — owner, admin, finance
- `rentals.equipment.manage` — owner, admin, finance, operations

### Navegação

Adicionar em `src/config/routeManifest.ts`, grupo **Vendas/Financeiro**:
- "Contratos de Renting" → `/dashboard/rentals` (capability `rentals.view`)
- "Parque instalado" → `/dashboard/rentals/equipment` (capability `rentals.view`)

## Plano de implementação

1. **Migration** — criar 4 tabelas novas + colunas em `invoices`/`invoice_items` + RLS + GRANTs + função `generate_rental_number()`.
2. **Capabilities** — adicionar `rentals.*` (frontend + backend SSoT).
3. **Rotas + manifest** — registar 5 rotas, adicionar ao sidebar.
4. **Hooks de dados** — `useRentalContracts`, `useEquipmentUnits`, `useCreateRentalContract`.
5. **Edge function `rental-contract-create`** — transacional.
6. **UI**:
   - Lista de contratos (tabela com filtros: status, cliente, financiadora, ordenar por data fim).
   - Wizard de criação (3 passos).
   - Detalhe do contrato (4 tabs).
   - Parque instalado (tabela com pesquisa por nº série, filtro por estado/produto/cliente).
7. **Integração CRM** — tab "Renting" na ficha de `companies` (cliente final).
8. **Seed** — criar empresa "Liquid" com tag `financial_partner` se ainda não existir (perguntar primeiro).

## Critérios de aceitação

- [ ] Conseguir criar um contrato com cliente final + Liquid + MyMia (3 anos) + tricoscópio, ambos com nº de série.
- [ ] Fatura à Liquid aparece em `/dashboard/invoices` com link de volta ao contrato.
- [ ] Nota proforma ao cliente final aparece marcada como "informativa".
- [ ] Em `/dashboard/rentals/equipment`, pesquisar pelo nº de série mostra o equipamento, cliente atual, contrato e timeline.
- [ ] Na ficha do cliente final, tab Renting mostra o contrato ativo.
- [ ] Tentar registar o mesmo nº de série duas vezes no mesmo workspace é bloqueado com mensagem clara.
- [ ] Timeline do contrato regista todos os eventos.
- [ ] Sidebar mostra "Renting" apenas a quem tem `rentals.view`.

## Riscos e pontos a validar

- **Liquid como cliente fiscal**: precisamos do NIF da Liquid e morada para a fatura. Confirmar antes do primeiro contrato real.
- **Nota ao cliente final**: usei `document_type='proforma'`. Confirmar se preferes uma "Nota de Atribuição" como tipo novo (não-fiscal) — recomendo proforma para não inflar a schema.
- **Renovações**: nesta v1 a renovação é manual (botão "Renovar contrato" que cria novo contrato ligado). Automação por cron pode vir numa fase 2.
- **Faturação mensal recorrente à Liquid**: na v1 emite-se **uma fatura total** à Liquid no início (modelo renting financeiro puro). Se quiseres faturação mensal recorrente, dizes e ligamos ao motor de Renewals já existente.
- **Devolução de equipamento**: ação manual no detalhe do equipamento (status `returned`, regista evento, liberta `current_contract_id`).

---

Confirma que avanço com este plano (ou diz o que ajustar) e parto para a migration + código.
