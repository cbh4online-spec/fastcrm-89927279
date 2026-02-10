

# Permitir Alteracao do Link Publico da Comunidade

## Problema Actual

O "Link Publico" e gerado automaticamente usando `window.location.origin`, que no ambiente de preview mostra o URL do Lovable (ex: `https://3e82dfd9-...lovableproject...`). Nao e editavel e expoe o dominio interno.

## Solucao

Adicionar um campo `custom_domain` na tabela `community_settings` para que o admin possa definir o dominio/URL base personalizado. O link publico sera construido a partir desse valor quando definido, ou usara o dominio publicado (`fastcrm.lovable.app`) como fallback.

### 1. Migracao SQL

Adicionar coluna `custom_domain` (text, nullable) a tabela `community_settings`.

```sql
ALTER TABLE public.community_settings
  ADD COLUMN IF NOT EXISTS custom_domain text;
```

### 2. Alteracoes no Dialog de Definicoes

No tab "Descobrir" do `CommunitySettingsDialog.tsx`:

- Adicionar campo editavel "Dominio / URL Base" onde o admin pode colocar o seu dominio (ex: `https://fastcrm.lovable.app` ou `https://meudominio.com`)
- O "Link Publico" passa a usar esse dominio como base: `${customDomain}/community/${slug}`
- Se nao houver dominio customizado, usa `https://fastcrm.lovable.app` como fallback (o dominio publicado)
- Campo com placeholder e texto explicativo

### 3. Ficheiros a Modificar

| Ficheiro | Alteracao |
|---|---|
| `src/components/community/CommunitySettingsDialog.tsx` | Novo campo "Dominio / URL Base", logica de construcao do link publico |
| `src/hooks/useCommunitySettings.ts` | Adicionar `custom_domain` ao interface `CommunitySettings` |

### 4. Logica do Link Publico

```text
Se custom_domain definido:
  Link = custom_domain + "/community/" + slug
Senao:
  Link = "https://fastcrm.lovable.app" + "/community/" + slug
```

O campo sera salvo junto com as outras definicoes ao clicar "Guardar".

