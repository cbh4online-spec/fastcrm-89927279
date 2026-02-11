

# Criar Banner Fotográfico para a Comunidade

## O que vou fazer

Gerar uma imagem de banner fotográfica/realista usando IA (modelo de geração de imagem) e implementar a lógica para:

1. **Gerar a imagem** via edge function usando o modelo `google/gemini-2.5-flash-image`
2. **Guardar no storage** no bucket `community-assets`
3. **Atualizar o `banner_url`** na tabela `community_settings`

## Abordagem

Como o banner é usado no hero da página e na sidebar, vou criar uma edge function que:
- Gera uma imagem realista/fotográfica (estilo equipa tech, networking, comunidade digital)
- Faz upload para o bucket `community-assets`
- Retorna o URL público

Depois, no componente de settings (`CommunitySettingsDialog`), vou adicionar um botão "Gerar com IA" ao lado do upload manual de banner, para que possas gerar e pré-visualizar antes de guardar.

## Detalhes Técnicos

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| `supabase/functions/generate-community-banner/index.ts` | Nova edge function para gerar imagem via IA |
| `src/components/community/CommunitySettingsDialog.tsx` | Adicionar botão "Gerar Banner com IA" |

### Edge Function: `generate-community-banner`

- Recebe: `{ prompt?: string }` (opcional, para personalizar)
- Usa modelo `google/gemini-2.5-flash-image` com prompt fotográfico
- Converte base64 para file e faz upload para `community-assets`
- Retorna `{ url: string }` com o URL público

### Prompt da imagem

Gerar uma imagem fotográfica realista com tema de comunidade/tecnologia/networking, optimizada para formato banner (16:9), com tons profissionais.

### Botão no Settings

No separador de "Imagem de Capa", adicionar um botão "Gerar com IA" que chama a edge function, mostra loading, e pré-carrega a imagem gerada como banner.

