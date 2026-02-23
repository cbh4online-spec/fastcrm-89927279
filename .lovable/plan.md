

# Elevar o Design Premium das Bio Pages (Preview + Pagina Publica)

## Problema

O design actual das Bio Pages -- tanto no preview do editor como na pagina publica -- esta muito basico e nao corresponde a qualidade visual de referencias como Linktree, Beacons ou Stan Store. Os blocos parecem simples, sem hierarquia visual, e a pagina publica tem um aspecto generico.

## Diagnostico Tecnico

Apos analise detalhada dos 3 ficheiros principais, identifiquei os seguintes problemas:

### 1. Preview no Editor (`BioBlockPreviewCard.tsx`)
- O fundo do preview e branco (`bg-background`) enquanto a pagina publica usa fundo escuro -- nao e WYSIWYG
- Os blocos de texto nao tem estilo visual (sem card, sem fundo)
- Botoes e links parecem identicos e sao pouco apelativos
- Testimonials nao mostram foto/avatar placeholder
- Social block e apenas texto com icone, sem icones das plataformas

### 2. Pagina Publica (`PublicBioPage.tsx`)
- TextBlock usa `text-white/90` hardcoded (nao respeita tema)
- FeatureBlock e muito simples (caixa com fundo transparente, sem destaque visual)
- TestimonialsBlock nao tem estrelas nem destaque visual
- FAQBlock tem estilo basico sem animacao suave
- Nao ha efeitos de hover, transicoes suaves ou micro-animacoes
- O footer "Powered by FastCRM" e quase invisivel
- Falta secao de "hero" mais impactante com mais espaco e tipografia maior

### 3. Campos inconsistentes nos templates
- Templates usam `subtitle` em features mas `BioBlockPreviewCard` le `description || subtitle` (OK no preview, mas confirmar na publica)
- Social block: templates usam `links[]` (array) -- PublicBioPage agora suporta ambos (OK)
- Testimonials: templates enviam campos simples `text/author` -- PublicBioPage suporta ambos (OK)

## Solucao: Redesign Visual Completo

### Ficheiro 1: `src/components/bio/BioBlockPreviewCard.tsx`

**Objectivo**: Tornar o preview WYSIWYG -- o que se ve no editor e exactamente o que aparece na pagina publica.

Alteracoes:
- **Fundo escuro no preview**: Mudar o container do preview para fundo escuro (gradient) para corresponder a pagina publica
- **TextBlock**: Adicionar estilo de card sutil com fundo semi-transparente, ou manter texto com cor clara sobre fundo escuro
- **Testimonials**: Adicionar estrelas douradas (amarelas), aspas decorativas e separador visual entre testemunhos
- **FeatureBlock**: Adicionar icone com fundo circular colorido, separador entre titulo e descricao, e CTA com seta animada
- **LinkBlock**: Redesenhar com icone a esquerda, seta a direita, fundo com hover effect
- **ButtonBlock**: Gradiente no botao, bordas arredondadas mais suaves, sombra
- **SocialBlock**: Mostrar icones circulares das plataformas (Instagram, Facebook, etc.) em vez de texto
- **FAQBlock**: Mostrar a primeira pergunta com icone de seta, estilo accordion fechado
- **WhatsApp**: Gradiente verde mais rico, icone WhatsApp mais proeminente

### Ficheiro 2: `src/pages/PublicBioPage.tsx`

**Objectivo**: Elevar a qualidade visual da pagina publica para nivel premium.

Alteracoes:
- **HeroBlock**: Aumentar tamanho do titulo (3xl -> 4xl em desktop), mais padding, animar entrada com fade-in
- **FeatureBlock**: Card com fundo `glass` (semi-transparente com blur), icone com background circular gradiente, CTA como link com seta animada ao hover
- **TestimonialsBlock**: Adicionar estrelas douradas/amarelas (fill), aspas grandes decorativas, foto placeholder (circulo com iniciais), card com borda sutil
- **FAQBlock**: Transicao suave ao abrir/fechar (max-height animation), icone rotativo na seta, cards com borda sutil
- **TextBlock**: Card com fundo sutil quando o texto e longo, ou citacao estilizada quando tem aspas/emoji
- **ButtonBlock**: Hover scale mais pronunciado, sombra glow sutil com cor primaria, bordas mais arredondadas (rounded-2xl)
- **LinkBlock**: Layout com icone decorativo, texto centrado, seta a direita, hover com deslocamento lateral
- **SocialBlock**: Icones circulares maiores (h-12 w-12), hover com scale + glow, label da plataforma ao hover
- **WhatsApp**: Pulso sutil no icone, gradiente mais vibrante
- **Layout geral**: Adicionar `gap-5` em vez de `gap-4`, padding inferior mais generoso, animacao de entrada staggered (cada bloco aparece com delay)
- **Footer**: Redesenhar "Powered by FastCRM" com link e estilo mais elegante

### Ficheiro 3: `src/components/bio/BioBlockEditor.tsx`

**Objectivo**: O fundo do preview no editor deve ser escuro para corresponder a pagina publica.

Alteracoes:
- Mudar o fundo do container de preview (dentro do "phone shell") de `bg-background` para um gradiente escuro que replica o fundo da pagina publica
- Usar a `primary_color` da pagina para gerar o gradiente de fundo (consistente com PublicBioPage)
- Ajustar o texto "Adicione blocos para comecar" para cor clara

## Detalhes de Implementacao

### Animacoes de entrada (PublicBioPage)
```text
Cada bloco aparece com:
- opacity: 0 -> 1
- translateY: 20px -> 0
- delay: index * 80ms
- CSS only (sem framer-motion na pagina publica para performance)
```

### Gradiente de fundo consistente
```text
Tanto o preview (BioBlockEditor) como a pagina publica (PublicBioPage) usarao:
background: linear-gradient(135deg, #0f0f23, {primaryColor}22, #0f0f23)
```

### Estrelas nos Testimonials
```text
5 estrelas douradas preenchidas (fill-amber-400)
Aspas grandes decorativas com cor primaria e opacity 20%
Iniciais do autor num circulo colorido
```

## Ficheiros a modificar

| Ficheiro | Accao |
|---|---|
| `src/components/bio/BioBlockPreviewCard.tsx` | Redesign visual de todos os blocos para WYSIWYG |
| `src/pages/PublicBioPage.tsx` | Elevar qualidade visual: animacoes, hover effects, tipografia, estrelas |
| `src/components/bio/BioBlockEditor.tsx` | Fundo escuro no container de preview para consistencia |

## Resultado esperado

- Preview no editor identico a pagina publica (fundo escuro, mesmos estilos)
- Blocos com aspecto premium: gradientes, sombras, icones decorativos
- Testimonials com estrelas douradas e aspas decorativas
- Features com icones circulares e CTAs animados
- FAQ com animacao suave e icones rotativos
- Animacoes de entrada staggered na pagina publica
- Social com icones circulares das plataformas
- Consistencia visual total entre editor e pagina final

