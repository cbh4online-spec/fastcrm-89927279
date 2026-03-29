

# Integração CRM nos Leitores de eBooks

## Diagnóstico

Actualmente, quando um leitor preenche o lead gate (nome + email), os dados são guardados em `ebook_views` mas **não é feito match com a tabela `contacts`**. O campo `contact_id` existe na tabela mas nunca é preenchido. O dashboard de analytics mostra os leitores identificados mas sem indicação de pertença ao CRM.

## Plano

### 1. Match CRM na criação da view (`PublicEbookPage.tsx`)

Na função `createView`, após receber o email do leitor:
- Fazer query a `contacts` pelo email no workspace: `contacts.email = reader_email AND workspace_id`
- Se encontrado: preencher `contact_id` no insert de `ebook_views`
- Se não encontrado: `contact_id` fica null

### 2. Enriquecer dados no hook de analytics (`useEbookAnalytics.ts`)

- Na lista `identifiedReaders`, incluir flag `isInCrm: boolean` (baseado em `contact_id !== null`)
- Expor `contactId` já existente na interface

### 3. Coluna CRM na tabela de leitores (`EbookAnalytics.tsx`)

- Adicionar coluna "CRM" na tabela de leitores identificados
- Se `contactId` existe: badge verde "No CRM" com link para `/contacts/{contactId}`
- Se não existe: badge cinza "Novo" — indicando que não consta no CRM
- Ordenar leitores: primeiro os do CRM, depois os novos

### 4. KPI adicional

- Novo KPI card: "Leitores no CRM" — contagem de views com `contact_id` preenchido vs total identificados

## Ficheiros

| Ficheiro | Acção |
|---|---|
| `src/pages/PublicEbookPage.tsx` | Match email com `contacts` ao criar view |
| `src/hooks/useEbookAnalytics.ts` | Flag `isInCrm` nos leitores |
| `src/components/ebooks/EbookAnalytics.tsx` | Coluna CRM + badge + KPI |

## Critérios de aceitação

- Lead gate com email existente no CRM preenche `contact_id` automaticamente
- Dashboard mostra claramente quais leitores estão no CRM
- Badge com link directo para o perfil do contacto
- KPI de conversão CRM visível

