
# Criar Editor de Aparência Premium para Funis

## Problema atual

A tab "Aparência" do template builder tem apenas 2 campos de texto para cores HSL. O editor de steps dos funis (FunnelStepEditor) tambem e muito basico -- apenas titulo, subtitulo, corpo e cor do CTA. Nao existe controlo real sobre tipografia, backgrounds, espacamento, sombras ou layout.

## Solucao

Criar um editor de aparencia premium com controlo visual completo, organizado em seccoes claras, para ambos os contextos (Templates AIDA e Steps de Funis).

## Componentes a criar

### 1. Color Picker visual (`src/components/ui/color-picker.tsx`)

Componente reutilizavel que combina:
- Input nativo `type="color"` para seleccao visual
- Campo de texto para valor hex/hsl
- Preview da cor seleccionada
- Presets de cores populares (paleta rapida)

### 2. Editor de Aparencia Premium (`src/components/funnels/AppearanceEditor.tsx`)

Painel completo com 4 seccoes colapsaveis (Accordion):

**A. Paleta de Cores**
- Cor primaria (com color picker visual)
- Cor accent/secundaria (com color picker visual)
- Cor de fundo (background)
- Cor de texto
- 6-8 presets de paletas prontas (ex: "Profissional Azul", "Energia Verde", "Luxo Dourado", "Tech Roxo")

**B. Tipografia**
- Font family para titulos (select com 8-10 Google Fonts populares: Inter, Poppins, Montserrat, Playfair Display, etc.)
- Font family para corpo
- Tamanho base (slider: 14-20px)
- Peso dos titulos (slider: 400-900)

**C. Layout e Espacamento**
- Border radius (slider: 0-24px com preview)
- Padding das seccoes (slider: compact/normal/spacious)
- Estilo do CTA: filled, outline, gradient
- Sombra dos cards (none, sm, md, lg)

**D. Background e Efeitos**
- Tipo de fundo: cor solida, gradiente, imagem
- Gradiente: seleccao de 2 cores + direcao (0-360 graus)
- Opacidade do overlay (slider 0-100)

### 3. Preview em tempo real

Painel lateral direito com mini-preview que actualiza em tempo real conforme as opcoes sao alteradas, mostrando uma mini landing page com as cores/fontes/espacamento aplicados.

## Alteracoes nos ficheiros existentes

### `src/components/landing-pages/VerticalTemplateBuilder.tsx`
- Substituir o conteudo da tab "Aparência" (linhas 516-553) pelo novo `AppearanceEditor`
- Expandir o objecto `cores` no form para incluir os novos campos (background, text_color, font_heading, font_body, border_radius, cta_style, shadow, gradient)

### `src/components/funnels/FunnelStepEditor.tsx`
- Adicionar uma seccao de "Design" abaixo do conteudo actual, usando o mesmo `AppearanceEditor` adaptado ao contexto de step

### Schema do form (campos novos no objecto `cores`)

```text
cores: {
  primaria: string        (existente)
  accent: string          (existente)
  background: string      (novo, default: "#ffffff")
  text_color: string      (novo, default: "#1a1a1a")
  font_heading: string    (novo, default: "Inter")
  font_body: string       (novo, default: "Inter")
  border_radius: number   (novo, default: 12)
  cta_style: string       (novo, default: "filled")
  shadow: string          (novo, default: "md")
  gradient: {             (novo, opcional)
    from: string
    to: string
    angle: number
  } | null
}
```

Nota: Como o campo `cores` na base de dados e JSONB, nao e necessaria migracao -- os novos campos sao adicionados automaticamente ao objecto JSON.

## Ficheiros a criar/modificar

| Ficheiro | Accao |
|---|---|
| `src/components/ui/color-picker.tsx` | Criar -- componente color picker reutilizavel |
| `src/components/funnels/AppearanceEditor.tsx` | Criar -- editor premium com 4 seccoes |
| `src/components/landing-pages/VerticalTemplateBuilder.tsx` | Modificar -- substituir tab Aparência |
| `src/components/funnels/FunnelStepEditor.tsx` | Modificar -- adicionar seccao de design |

## Presets de paletas incluidos

| Nome | Primaria | Accent | Background | Texto |
|---|---|---|---|---|
| Profissional Azul | #2563eb | #3b82f6 | #f8fafc | #0f172a |
| Energia Verde | #16a34a | #22c55e | #f0fdf4 | #14532d |
| Luxo Dourado | #b45309 | #f59e0b | #fffbeb | #451a03 |
| Tech Roxo | #7c3aed | #a78bfa | #f5f3ff | #1e1b4b |
| Coral Moderno | #e11d48 | #fb7185 | #fff1f2 | #4c0519 |
| Neutro Elegante | #374151 | #6b7280 | #f9fafb | #111827 |

## Resultado esperado

- Editor de aparencia visualmente rico e intuitivo
- Seleccao de cores com picker visual (nao apenas texto HSL)
- Paletas pre-definidas para aplicar com 1 clique
- Controlo de tipografia, espacamento e efeitos
- Preview em tempo real das alteracoes
- Compativel com ambos os contextos (Templates AIDA e Steps de Funis)
