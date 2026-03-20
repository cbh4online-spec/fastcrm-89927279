

## Adicionar Links de Posts de Redes Sociais aos Testemunhos

### O que será feito
Cada testemunho passará a ter um campo opcional `post_url` para colocar o link do post original (LinkedIn, Instagram, etc.). Esse link será exibido como ícone clicável junto ao testemunho na landing page.

### Alterações

#### 1. Interfaces — Adicionar `post_url` ao tipo de testemunho
- **`src/config/verticalConfigs.ts`** — `VerticalTestimonial`: adicionar `post_url?: string`
- **`src/components/funnels/FunnelStepEditor.tsx`** — `TestimonialItem`: adicionar `post_url?: string`
- **`src/hooks/useVerticalTemplates.ts`** — tipo inline de testimonials: adicionar `post_url?: string`

#### 2. Editores — Campo de input para o link do post
- **`src/components/funnels/FunnelStepEditor.tsx`** (linha ~614-629): adicionar campo "Link do Post (opcional)" com input URL ao lado do Avatar URL
- **`src/components/landing-pages/VerticalTemplateBuilder.tsx`**: adicionar campo equivalente no formulário de testemunhos do template AIDA

#### 3. Renderização — Mostrar link na landing page
- **`src/components/vertical-landing/VerticalTestimonials.tsx`**: se `post_url` existir, mostrar ícone da rede social (detectar automaticamente se é LinkedIn, Instagram, etc. pelo domínio) com link externo junto ao nome/role
- **`src/components/funnels/FunnelStepRenderer.tsx`** (se renderiza testemunhos): mesma lógica

### Detecção automática da rede social
Função utilitária que analisa o URL e retorna o ícone correcto:
- `linkedin.com` → ícone LinkedIn
- `instagram.com` → ícone Instagram  
- `facebook.com` → ícone Facebook
- `twitter.com` / `x.com` → ícone X
- Outro → ícone ExternalLink genérico

### Ficheiros a alterar
- `src/config/verticalConfigs.ts`
- `src/hooks/useVerticalTemplates.ts`
- `src/components/funnels/FunnelStepEditor.tsx`
- `src/components/landing-pages/VerticalTemplateBuilder.tsx`
- `src/components/vertical-landing/VerticalTestimonials.tsx`

