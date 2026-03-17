

## Plano: Equiparar formulário de Lead Empresa ao de Empresas + Pesquisa de contactos

### Problema
1. O campo "Setor" tem validação `max(100)` mas o `cae_description` do NIF pode ter centenas de caracteres → erro de validação
2. O formulário de Lead Empresa não mostra o cartão rico de "Dados obtidos via NIF" (morada, natureza jurídica, capital social, CAE badges, link Racius, etc.) como aparece nas Empresas
3. Faltam colunas `about`, `activity_description`, `racius_url` na tabela `leads`
4. Não existe funcionalidade para pesquisar contactos/emails/telefones/redes sociais da empresa após preenchimento

### Implementação

**1. Migração DB — adicionar colunas em falta**
- Adicionar `about TEXT`, `activity_description TEXT`, `racius_url TEXT` à tabela `leads`

**2. Refactor do `CreateLeadDialog.tsx` (modo Empresa)**
- Remover validação `max(100)` do campo `industry` (usar `max(2000)`)
- Expandir o `formData` / state para incluir todos os campos NIF (cae_codes, cae_description, legal_nature, capital_social, founding_date, region, county, parish, fax, about, activity_description, racius_url)
- No `onSuccess` do NIF lookup, preencher **todos** os campos (como faz o `CreateCompanyDialog`)
- Adicionar o cartão azul "Dados obtidos via NIF" com CAE badges, morada, natureza jurídica, capital social, estado, link Racius — idêntico ao das empresas
- Abrir automaticamente os campos opcionais quando o NIF é encontrado

**3. Atualizar `useLeads.ts`**
- Expandir interfaces `Lead` e `CreateLeadInput` com os novos campos (`about`, `activity_description`, `racius_url`, `cae_codes`, `cae_description`, `legal_nature`, `capital_social`, `founding_date`, `region`, `county`, `parish`, `fax`)
- Incluir esses campos no `mutateAsync` do `createLead`

**4. Pesquisa de contactos da empresa (fase futura)**
- Após criar o lead empresa, permitir pesquisar contactos (pessoas, emails, telefones, redes sociais) associados à empresa — via edge function de enriquecimento ou pesquisa web
- Será implementado como botão "Procurar contactos" no detalhe do lead, reutilizando o motor de enriquecimento existente

### Ficheiros a alterar
- `supabase/migrations/` — nova migração (3 colunas)
- `src/components/crm/CreateLeadDialog.tsx` — formulário rico com cartão NIF
- `src/hooks/useLeads.ts` — interfaces e mutação

