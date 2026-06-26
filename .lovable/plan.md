## Diagnóstico

Hoje os fluxos de criação (Contactos, Empresas, Leads) são **diálogos compactos** (`CreateContactDialog`, `CreateCompanyDialog`, e equivalente Lead) com layout antigo, sem secções fiscais e de faturação. Os prints do InvoiceXpress mostram:
- Página completa (sem modal)
- Título grande "Novo Contacto" + secções com cabeçalho + descrição
- Cartões brancos com inputs grandes, espaçamento generoso
- Barra fixa em rodapé com Cancelar / Guardar
- Secções: **Informação Fiscal**, **Detalhes**, **Contacto Preferencial**, **Preferências de Faturação**

## Decisões de produto/UX

1. Substituir os diálogos por **páginas dedicadas**:
   - `/dashboard/contacts/new`
   - `/dashboard/companies/new`
   - `/dashboard/leads/new`
   Os botões "Novo …" das listas IX passam a navegar para estas rotas em vez de abrir diálogo. Mantemos os diálogos como wrapper fino que reencaminham — funcionalidades dependentes (criação rápida a partir de outros sítios) ficam intactas.
2. Preservar 100% das funcionalidades atuais: enriquecimento IA, deteção de duplicados, custom fields, autofill IA, validações zod, PhoneInput.
3. Adicionar novas secções/campos fiscais — guardados em colunas existentes ou novas (ver técnico).
4. Layout IX consistente via novo componente partilhado `IXFormLayout` (header, secções, footer fixo).

## Estrutura técnica

### Novo componente partilhado
- `src/components/forms/IXFormLayout.tsx` — moldura completa: header com título + voltar, container `max-w-5xl`, footer sticky com Cancelar/Guardar.
- `src/components/forms/IXFormSection.tsx` — cabeçalho da secção (título grande + subtítulo cinza) + cartão branco com `rounded-2xl` e `border`.
- `src/components/forms/IXField.tsx` — wrapper consistente para label/input/contador (0/100).

### Páginas novas
- `src/pages/contacts/NewContactPage.tsx`
- `src/pages/companies/NewCompanyPage.tsx`
- `src/pages/leads/NewLeadPage.tsx`

Cada página implementa as 4 secções IX, reutilizando hooks existentes (`useContacts`, `useCompanies`, `useLeads`, `useContactEnrichment`, `useContactDuplicateCheck`, `CustomFieldsFormCreate`, `AIAutofillPreviewDialog`).

### Esquema de base de dados
Migração única adicionando às tabelas `contacts`, `companies`, `leads`:
- `nif text`, `nif_country text default 'PT'`, `is_final_consumer boolean default false`, `external_code text`
- `address_line text`, `city text` (já existe em algumas), `postal_code text`, `country text`, `website text`
- `preferred_contact_name text`, `preferred_contact_email text`, `preferred_contact_phone text`
- Bloco JSONB `billing_preferences jsonb` com: `use_account_defaults bool`, `vat_exemption_reason text`, `payment_method text`, `language text`, `currency text`, `payment_terms text`, `copies int`, `notes text`

(Cria apenas as colunas em falta; verifica antes via information_schema.) GRANTs já cobertos para essas tabelas.

### Rotas
- Adicionar 3 rotas em `CRMRoutes.tsx`/`SalesCRMRoutes.tsx`.

### Compat
- `CreateContactDialog`, `CreateCompanyDialog`, `CreateLeadDialog` passam a, ao abrir, redirecionar para a página nova e fechar. Mantemos a exportação para não partir imports existentes.
- Toolbars `ContactsListIX`/`CompaniesListIX`/`LeadsListIX`: trocar handler do CTA "Novo" para `navigate('/dashboard/.../new')`.

## Plano de implementação

1. **Migração SQL** para adicionar colunas fiscais/faturação em `contacts`, `companies`, `leads` (idempotente com `IF NOT EXISTS`).
2. **Componentes IX de formulário** (`IXFormLayout`, `IXFormSection`, `IXField`).
3. **`NewContactPage`** — referência, com todas as 4 secções, enriquecimento, duplicados, custom fields, autofill, validação zod.
4. **`NewCompanyPage`** — adaptação (sem `preferred channel` mas com NIF, morada, faturação).
5. **`NewLeadPage`** — adaptação (com origem/score/owner mantidos das funcionalidades atuais).
6. **Rotas** registadas + redirect dos diálogos legados.
7. **CTAs** das listas IX a apontar para as novas páginas.

## Critérios de aceitação

- Os botões "Novo Contacto/Empresa/Lead" abrem página dedicada com o layout dos prints.
- Todas as funcionalidades anteriores (IA enriquecimento, duplicados, custom fields, autofill, tags, validações telefónicas) continuam a funcionar.
- Os novos campos fiscais são persistidos e visíveis após guardar.
- Footer sticky com Cancelar/Guardar; toast e navegação para detalhe ao guardar.
- Toggle "Consumidor final" desativa secções não aplicáveis.
- Sem erros de consola; responsivo (≥ md em duas colunas, mobile uma coluna).

## Riscos e pontos por validar

- Alguns campos novos podem já existir noutra tabela auxiliar (ex.: morada em `companies`). Vou inspecionar antes da migração para evitar duplicar.
- Triggers de auditoria existentes (`contacts_audit_log`, etc.) podem precisar refletir colunas novas — manter os triggers genéricos (`row_to_json`) intactos é suficiente.
- Botões "Novo Contacto" usados em sítios contextuais (ex.: dentro de uma Empresa) — vou manter o diálogo nesses casos via prop `inline`.
