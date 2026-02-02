
# Plano: Corrigir Vista Pública de Propostas - Políticas RLS

## Problema Identificado

A página pública de propostas (`/p/:slug`) não consegue carregar os dados relacionados devido a **políticas RLS** que bloqueiam o acesso para utilizadores não autenticados:

| Tabela | Política Pública | Status |
|--------|------------------|--------|
| `proposals` | ✅ `Public can view published proposals by slug` | OK |
| `workspaces` | ❌ Apenas membros autenticados | **BLOQUEADO** |
| `contacts` | ❌ Apenas membros autenticados | **BLOQUEADO** |
| `companies` | ❌ Apenas membros autenticados | **BLOQUEADO** |
| `proposal_items` | ❌ Apenas membros autenticados | **BLOQUEADO** |

### Dados Afetados na Vista Pública

- **Logo da empresa** - vem de `workspaces.logo_url` → mostra letra genérica
- **Nome do cliente** - vem de `contacts.name` ou `companies.name` → mostra "Cliente"
- **Itens da proposta** - vem de `proposal_items` → tabela vazia
- **Dados do workspace** (email, telefone, IBAN) → não aparecem

## Solução: Novas Políticas RLS para Acesso Público

Criar políticas que permitem leitura pública apenas quando os dados estão **associados a uma proposta publicada**.

### Migração SQL

```sql
-- 1. Workspaces: Permitir leitura pública para propostas publicadas
CREATE POLICY "Public can view workspace for published proposals"
ON public.workspaces
FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT workspace_id FROM public.proposals 
    WHERE status = 'published'
  )
);

-- 2. Contacts: Permitir leitura pública para propostas publicadas
CREATE POLICY "Public can view contact for published proposals"
ON public.contacts
FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT contact_id FROM public.proposals 
    WHERE status = 'published' AND contact_id IS NOT NULL
  )
);

-- 3. Companies: Permitir leitura pública para propostas publicadas
CREATE POLICY "Public can view company for published proposals"
ON public.companies
FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT company_id FROM public.proposals 
    WHERE status = 'published' AND company_id IS NOT NULL
  )
);

-- 4. Proposal Items: Permitir leitura pública para propostas publicadas
CREATE POLICY "Public can view items of published proposals"
ON public.proposal_items
FOR SELECT
TO anon, authenticated
USING (
  proposal_id IN (
    SELECT id FROM public.proposals 
    WHERE status = 'published'
  )
);
```

## Diagrama de Acesso

```text
┌───────────────────────────────────────────────────────────────┐
│  Utilizador Anónimo acede /p/ixnmwmy1u75i                    │
└───────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│  SELECT * FROM proposals WHERE slug = 'xyz' AND status = 'published'
│  ✅ Policy: "Public can view published proposals by slug"    │
└───────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         ▼                                           ▼
┌─────────────────────┐                   ┌─────────────────────┐
│  JOIN workspaces    │                   │  JOIN contacts      │
│  ✅ NOVA POLICY     │                   │  ✅ NOVA POLICY     │
│  (linked to pub     │                   │  (linked to pub     │
│   proposal)         │                   │   proposal)         │
└─────────────────────┘                   └─────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│  SELECT * FROM proposal_items WHERE proposal_id = ...        │
│  ✅ NOVA POLICY: "Public can view items of published..."     │
└───────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

Após a migração, a página pública mostrará:

1. **Logo do workspace** em vez da letra genérica "E"
2. **Nome do cliente** "Jorge Cardoso" em vez de "Cliente"
3. **7 itens da proposta** com preços e descrições
4. **Secções de Âmbito, Cronograma e Referências** (já passadas via props)
5. **Dados de pagamento** (IBAN, condições) do workspace

## Segurança

As novas políticas são **somente leitura (SELECT)** e limitadas a:
- Apenas dados vinculados a propostas com `status = 'published'`
- Utilizadores anónimos só veem dados expostos intencionalmente pelo workspace

### Dados Expostos (intencional)

| Campo | Visível | Racional |
|-------|---------|----------|
| `workspace.name` | ✅ | Branding da empresa |
| `workspace.logo_url` | ✅ | Visual do documento |
| `workspace.phone/email` | ✅ | Contacto comercial |
| `contact.name` | ✅ | Destinatário do documento |
| `proposal_items.*` | ✅ | Conteúdo da proposta |

### Dados NÃO Expostos

- `proposal_items.cost_snapshot` - custos internos (não aparecem no template público)
- Outras propostas (draft/rejected) do mesmo workspace

## Ficheiros a Modificar

| Ficheiro | Acção |
|----------|-------|
| Nova migração SQL | Adicionar 4 políticas RLS públicas |

## Complexidade

Baixa - Apenas 1 migração SQL com 4 políticas.
