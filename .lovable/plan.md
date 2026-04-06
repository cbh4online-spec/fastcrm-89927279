

# Corrigir gravação do WhatsApp (e outras redes sociais) nos Leads

## Diagnóstico

O campo WhatsApp (e YouTube, TikTok, Pinterest) não grava porque:

1. **`LEADS_SELECT_COLUMNS` não inclui estes campos** — os dados nunca são carregados do banco, logo a UI mostra sempre vazio
2. **Interface `Lead` não tem estas propriedades** — `whatsapp_url`, `youtube_url`, `tiktok_url`, `pinterest_url` não existem no tipo TypeScript
3. **`CreateLeadInput` também não tem** — logo `UpdateLeadInput` (que extends `Partial<CreateLeadInput>`) também não os inclui

As colunas existem na base de dados (migração `20260318185906`), mas o código TypeScript nunca as busca nem as inclui nos tipos.

## Solução

### 1. Adicionar campos à interface `Lead` em `src/hooks/useLeads.ts`
- Adicionar `youtube_url`, `tiktok_url`, `pinterest_url`, `whatsapp_url` (todos `string | null`)

### 2. Adicionar campos ao `CreateLeadInput` em `src/hooks/useLeads.ts`
- Adicionar os mesmos 4 campos como opcionais

### 3. Adicionar campos ao `LEADS_SELECT_COLUMNS` em `src/hooks/constants/selectColumns.ts`
- Incluir `youtube_url, tiktok_url, pinterest_url, whatsapp_url` na query

### 4. Adicionar campos ao `LEADS_SELECT_COLUMNS` local em `src/hooks/useSmartLeads.ts`
- Incluir os mesmos 4 campos

## Ficheiros a editar

| Ficheiro | Alteração |
|---|---|
| `src/hooks/useLeads.ts` | Adicionar 4 campos sociais ao `Lead` e `CreateLeadInput` |
| `src/hooks/constants/selectColumns.ts` | Adicionar 4 campos ao SELECT |
| `src/hooks/useSmartLeads.ts` | Adicionar 4 campos ao SELECT local |

## Critérios de aceitação
- WhatsApp grava e mostra o valor após reload
- YouTube, TikTok e Pinterest também funcionam
- Dados aparecem no painel lateral do lead detail

