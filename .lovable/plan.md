

## Plano: Adicionar redes sociais em falta no EntityDetailsPanel

### Problema
O painel lateral "Detalhes" (`EntityDetailsPanel.tsx`) — visível no screenshot — só mostra 4 redes sociais (LinkedIn, Instagram, Facebook, Twitter/X). As 4 novas redes (YouTube, TikTok, Pinterest, WhatsApp) já existem na base de dados mas não aparecem neste painel.

### Alterações

**Ficheiro: `src/components/entity/EntityDetailsPanel.tsx`**

1. **Importar ícones** — Adicionar `Youtube`, `Pin`, `MessageCircle` do lucide-react + criar `TikTokIcon` SVG inline (mesmo padrão já usado nos outros componentes)

2. **LeadDetails** (linhas 343-348) — Adicionar 4 `EditableFieldRow` para:
   - YouTube (`youtube_url`, ícone Youtube, cor vermelha)
   - TikTok (`tiktok_url`, TikTokIcon)
   - Pinterest (`pinterest_url`, ícone Pin)
   - WhatsApp Business (`whatsapp_url`, ícone MessageCircle, cor verde)

3. **CompanyDetails** (linhas 277-282) — Mesmo tratamento, adicionar as 4 redes em falta

4. **ContactDetails** (linhas 314-318) — Mesmo tratamento, adicionar as 4 redes em falta + Twitter/X (que também falta nos contactos)

### Impacto
- 1 ficheiro editado
- Sem alterações na base de dados (colunas já existem)
- Consistência total com os outros componentes `SocialMediaSection`

