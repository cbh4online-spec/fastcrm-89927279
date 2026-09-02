# Campos de morada em Leads e Contactos

## Diagnóstico (verificado na base de dados e no código)

- `leads` já tem: `address`, `address_number`, `address_floor`, `postal_code`, `city`, `region`, `country`.
- `contacts` tem: `address`, `postal_code`, `city`, `country`, `is_fiscal_address` — **faltam** `address_number`, `address_floor`, `region`.
- A ficha de Contacto já tem secção "Morada" (`AddressSection`), mas só com morada, cidade, código postal e morada fiscal.
- A ficha de Lead (`LeadDetailWithSidebar`) **não tem** qualquer bloco de morada.
- `CreateLeadDialog` já recolhe morada, cidade e código postal; `CreateContactDialog` não recolhe morada nenhuma.
- As listagens `ContactsListIX` e `LeadsListIX` não oferecem colunas de morada.

## O que vai ser feito

Conjunto de campos padrão nas duas entidades: **Morada, Número, Andar, Código Postal, Cidade, Região, País**.

1. **Base de dados** — migração aditiva: adicionar `address_number`, `address_floor` e `region` (texto, nullable) a `contacts`. Sem alterações destrutivas; `leads` fica como está.
2. **Ficha de Lead** — nova secção "Morada" no separador Visão geral, editável e gravada via `useUpdateLead`, seguindo o padrão visual da secção equivalente do Contacto.
3. **Ficha de Contacto** — completar a `AddressSection` com Número, Andar, Região e País, mantendo o campo de morada fiscal.
4. **Diálogos de criação** — bloco "Morada" (colapsável, opcional) no `CreateContactDialog`; no `CreateLeadDialog` acrescentar Número, Andar, Região e País aos campos já existentes, com validação zod de comprimento máximo.
5. **Listagens** — novas colunas opcionais (ocultas por defeito) em Contactos e Leads: Morada, Código Postal, Cidade, País; incluídas no seletor de colunas e nas queries de leitura.

## Notas técnicas

- Migração via ferramenta de migrações, colunas nullable, sem defaults obrigatórios; tipos regenerados a seguir.
- Sem alterações de RLS: os campos vivem nas tabelas já protegidas por workspace.
- Validação zod nos formulários (máx. 300 para morada, 20 para código postal, 100 para os restantes) e trim antes de gravar.
- Estados vazios mostram "—" nas listagens e placeholders nas fichas.
- Cabeçalhos de coluna com largura fixa coerente com o padrão `COLUMN_WIDTH` já usado.

## Critérios de aceitação

- Criar lead e contacto com morada completa grava todos os campos.
- Editar morada na ficha de lead e de contacto persiste e reflete-se após recarregar.
- As colunas de morada podem ser ativadas no seletor e mostram os valores corretos.
- Typecheck e build verdes; sem erros de consola.
