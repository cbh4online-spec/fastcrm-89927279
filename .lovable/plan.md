

## Plano: Adicionar YouTube, TikTok e outras redes sociais

### Alterações na Base de Dados
Migração SQL para adicionar novas colunas às 3 tabelas de entidades:
- `leads`: ADD `youtube_url`, `tiktok_url`, `pinterest_url`, `whatsapp_url`
- `contacts`: ADD `youtube_url`, `tiktok_url`, `pinterest_url`, `whatsapp_url`  
- `companies`: ADD `youtube_url`, `tiktok_url`, `pinterest_url`, `whatsapp_url`

Redes a adicionar (além das 4 existentes):
- **YouTube** — essencial para negócios com conteúdo vídeo
- **TikTok** — crescimento massivo, relevante para marketing
- **Pinterest** — relevante para e-commerce e design
- **WhatsApp Business** — canal direto de comunicação (já existe `whatsapp_number` em contacts, mas URL do perfil business é diferente)

### Componentes a Atualizar

**1. `src/components/shared/SocialMediaFields.tsx`** — Componente partilhado de formulário
- Adicionar props: `youtubeUrl`, `tiktokUrl`, `pinterestUrl`, `whatsappUrl`
- Adicionar campos de input com ícones respetivos (Youtube, Music2 para TikTok, etc.)

**2. `src/components/companies/sections/SocialMediaSection.tsx`** — Sidebar de empresas
- Adicionar InlineEditableField para YouTube, TikTok, Pinterest, WhatsApp

**3. `src/components/contacts/EditContactDialog.tsx`** — Edição de contactos
- Passar novas props ao SocialMediaFields

**4. `src/components/companies/EditCompanyDialog.tsx`** — Edição de empresas
- Passar novas props ao SocialMediaFields

**5. Lead detail sidebar** — Onde aparece "Redes Sociais" no screenshot
- Adicionar campos para as novas redes

**6. `src/components/companies/dialogs/EnrichCompanyDialog.tsx`** — Enriquecimento
- Adicionar mapeamento das novas redes no `SOCIAL_MAPPING`

### Ícones
- YouTube: ícone `Youtube` do lucide-react
- TikTok: não existe no lucide, usar SVG inline ou `Music2`
- Pinterest: não existe no lucide, usar SVG inline ou `Pin`
- WhatsApp: já existe SVG inline noutros componentes do projeto

