

# Account Brief — Contactos, Redes Sociais e Pessoas

## Objetivo
Expandir o módulo Account Brief para recolher e apresentar informação completa sobre **contactos/pessoas da empresa** e **redes sociais**, tanto ao nível da empresa como das pessoas-chave.

## Estado Atual
- A extração (`account-brief-extract-structured`) já pede `contacts.team_members` (name, role, linkedin) e `public_emails`
- Os dados são guardados em `account_brief_public_contacts` (campos: contact_name, role_title, linkedin_url, email, source_url)
- **Falta**: telefone, foto, redes sociais individuais, redes sociais da empresa
- **Falta**: Secção na UI para mostrar contactos e redes sociais

## Plano

### 1. Migração DB — Expandir tabelas

**`account_brief_public_contacts`** — adicionar colunas:
- `phone` (text, nullable)
- `twitter_url` (text, nullable)
- `photo_url` (text, nullable)
- `seniority_level` (text, nullable) — ex: C-Level, VP, Director, Manager
- `department` (text, nullable) — ex: Sales, Marketing, Engineering

**`account_brief_accounts`** — adicionar colunas para redes sociais da empresa:
- `linkedin_url` (text, nullable)
- `instagram_url` (text, nullable)
- `facebook_url` (text, nullable)
- `twitter_url` (text, nullable)
- `youtube_url` (text, nullable)
- `tiktok_url` (text, nullable)
- `phone_main` (text, nullable)
- `email_main` (text, nullable)

### 2. Edge Function — Expandir prompt de extração

**`account-brief-extract-structured/index.ts`**:
- Expandir o schema `contacts` do tool call para incluir:
  - `social_media` (objeto com linkedin, instagram, facebook, twitter, youtube, tiktok da empresa)
  - `public_phones` (array de strings)
  - `main_email` (string)
  - Expandir `team_members` com: phone, twitter, photo_url, seniority_level, department
- Após extração, guardar redes sociais na tabela `account_brief_accounts` e contactos expandidos em `account_brief_public_contacts`

### 3. Hook — Consultar contactos da conta

**Criar `src/hooks/useAccountBriefContacts.ts`**:
- Query para listar contactos de `account_brief_public_contacts` por `account_id`
- Ordenar por seniority (C-Level primeiro)

### 4. UI — Secção de Contactos e Redes Sociais no detalhe da conta

**`AccountBriefAccountDetailPage.tsx`** — adicionar duas secções:

**a) Card "Redes Sociais"** (sidebar):
- Ícones clicáveis para cada rede social da empresa (LinkedIn, Instagram, Facebook, Twitter, YouTube, TikTok)
- Email e telefone principais

**b) Card "Pessoas-Chave"** (conteúdo principal):
- Lista de contactos com: nome, cargo, departamento, nível de senioridade
- Links para LinkedIn/Twitter individuais
- Email e telefone quando disponíveis
- Badge de seniority (C-Level, VP, etc.)

### Ficheiros Afetados
- **Migração SQL**: nova migração para ALTER TABLE
- **Edge Function**: `supabase/functions/account-brief-extract-structured/index.ts`
- **Novo hook**: `src/hooks/useAccountBriefContacts.ts`
- **UI**: `src/pages/AccountBriefAccountDetailPage.tsx`

