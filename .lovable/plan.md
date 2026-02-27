

# Gerar Imagens com IA para a Landing Page FastCRM

## Abordagem

Criar uma edge function dedicada `landing-generate-images` que gera 8 imagens via Lovable AI (gemini-2.5-flash-image), faz upload para um bucket `landing-assets` e devolve os URLs públicos. Depois, integrar essas imagens nos componentes.

## Imagens a gerar (8 total)

1. **Hero** — Dashboard CRM futurista com gráficos de receita, dark theme com tons azul/roxo
2. **Solution Card 1** — Interface CRM com pipeline de deals e contacts
3. **Solution Card 2** — Dashboard de analytics com gráficos e health scores
4. **Solution Card 3** — Workflow de automação com nodes conectados
5. **Solution Card 4** — Marketplace de extensões/plugins com cards
6. **Positioning Founders** — Empreendedor solo a trabalhar num laptop
7. **Positioning Teams** — Equipa colaborativa em reunião com dashboards
8. **Positioning Leaders** — Líder executivo a analisar métricas de crescimento

## Alterações

### 1. Criar bucket `landing-assets` (migração SQL)
- Bucket público para servir imagens estáticas

### 2. Criar edge function `landing-generate-images/index.ts`
- Aceita um array de prompts com IDs
- Gera cada imagem via `google/gemini-2.5-flash-image`
- Upload para `landing-assets/{id}.png`
- Devolve mapa `{id: publicUrl}`

### 3. Criar página admin `src/pages/GenerateLandingImages.tsx`
- Botão "Gerar Imagens" que chama a edge function
- Mostra progresso e preview das imagens geradas
- Guarda os URLs no localStorage ou mostra para copiar

### 4. Actualizar `LandingHeroSection.tsx`
- Adicionar imagem de dashboard mockup abaixo do formulário (usando o asset existente ou o gerado)

### 5. Actualizar `LandingSolutionSection.tsx`
- Adicionar imagem ilustrativa no topo de cada card (aspect-ratio 16:9, rounded, com overlay gradient)

### 6. Actualizar `LandingPositioningSection.tsx`
- Adicionar imagem circular ou rounded acima do ícone em cada card

## Ficheiros a criar/modificar
1. **Criar** migração SQL — bucket `landing-assets`
2. **Criar** `supabase/functions/landing-generate-images/index.ts`
3. **Criar** `src/pages/GenerateLandingImages.tsx`
4. **Modificar** `src/components/landing-fastcrm/LandingHeroSection.tsx`
5. **Modificar** `src/components/landing-fastcrm/LandingSolutionSection.tsx`
6. **Modificar** `src/components/landing-fastcrm/LandingPositioningSection.tsx`
7. **Modificar** `supabase/config.toml` (adicionar função)
8. **Modificar** `src/App.tsx` (rota admin para geração)

