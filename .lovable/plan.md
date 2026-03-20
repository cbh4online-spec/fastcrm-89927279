

## Adicionar Redes Sociais e Links de Publicações aos Templates/Funis

### O que será feito
Adicionar uma secção de redes sociais (Facebook, Instagram, LinkedIn, WhatsApp, YouTube, TikTok, Twitter/X) e links de publicações/artigos ao template AIDA, visíveis no footer e opcionalmente numa secção dedicada da landing page pública.

### Alterações

#### 1. Migração DB — Coluna `social_links` na tabela `vertical_templates`
- Adicionar coluna `social_links jsonb` para guardar URLs das redes e publicações

#### 2. Interface `VerticalConfig` — `src/config/verticalConfigs.ts`
- Adicionar campo `social_links` com estrutura:
```typescript
social_links?: {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  whatsapp?: string;
  youtube?: string;
  tiktok?: string;
  twitter?: string;
  website?: string;
  publications?: { title: string; url: string }[];
}
```

#### 3. Editor — `VerticalTemplateBuilder.tsx`
- Novo tab "Redes Sociais" com inputs para cada rede social e lista dinâmica de publicações (título + URL, adicionar/remover)
- Incluir `social_links` no `previewConfig` e no `defaultForm`

#### 4. Footer — `VerticalFooter.tsx`
- Renderizar ícones das redes sociais configuradas com links
- Listar publicações/artigos se existirem

#### 5. Mapeamento — `VerticalLandingPage.tsx`
- Mapear `row.social_links` no `rowToConfig`

#### 6. Hook — `useVerticalTemplates.ts`
- Incluir `social_links` na tipagem e no provisionamento

### Ficheiros a criar/alterar
- `supabase/migrations/` — nova coluna `social_links`
- `src/config/verticalConfigs.ts`
- `src/components/landing-pages/VerticalTemplateBuilder.tsx`
- `src/components/vertical-landing/VerticalFooter.tsx`
- `src/pages/VerticalLandingPage.tsx`
- `src/hooks/useVerticalTemplates.ts`

