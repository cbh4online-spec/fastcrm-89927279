
# Adicionar Avatar e Logotipo ao Bloco Hero do Bio OS

## Problema Actual

O bloco Hero das Bio Pages apenas suporta um icone Lucide (ex: Sparkles, Heart). O utilizador quer poder tambem usar um **avatar** (foto pessoal) ou um **logotipo** (imagem da marca) no lugar do icone.

## Solucao

Adicionar um campo `hero_media_type` ao conteudo do bloco Hero com 3 opcoes: `icon` (actual), `avatar` e `logo`. Quando "avatar" ou "logo" for selecionado, o utilizador pode fazer upload ou gerar a imagem via IA usando o componente `BioImageUploader` existente.

## Alteracoes

| Ficheiro | O que muda |
|---|---|
| `src/components/bio/BioBlockEditor.tsx` | Adicionar selector de tipo de media (icon/avatar/logo) + campo de upload quando avatar ou logo |
| `src/components/bio/BioBlockPreviewCard.tsx` | Renderizar avatar (circular) ou logo (rectangular) no preview do editor |
| `src/pages/PublicBioPage.tsx` | Renderizar avatar/logo na pagina publica |

### Detalhe Tecnico

**1. Novo campo no conteudo do bloco Hero:**
```typescript
// content do bloco hero passa a ter:
{
  title: string;
  subtitle: string;
  cta_text: string;
  cta_url: string;
  icon: string;           // existente
  hero_media_type: "icon" | "avatar" | "logo";  // NOVO (default: "icon")
  hero_image: string;     // NOVO - URL da imagem (avatar ou logo)
  bg_image: string;       // existente
}
```

Nao e preciso migrar a base de dados pois o campo `content` e JSON livre.

**2. Editor (BioBlockEditor.tsx) - Painel de Propriedades:**
- Adicionar um grupo de 3 botoes (icon / avatar / logo) antes dos campos actuais
- Se `hero_media_type === "icon"`: mostra o IconPickerField (actual)
- Se `hero_media_type === "avatar"` ou `"logo"`: mostra o BioImageUploader para upload da imagem

**3. Preview no Editor (BioBlockPreviewCard.tsx):**
- Se `hero_media_type === "avatar"`: mostrar a imagem em circulo (como esta agora com o icone, mas com `<img>`)
- Se `hero_media_type === "logo"`: mostrar a imagem em formato rectangular/quadrado com cantos arredondados
- Se `hero_media_type === "icon"` ou nao definido: comportamento actual (icone Lucide)

**4. Pagina Publica (PublicBioPage.tsx):**
- Mesma logica do preview: renderizar avatar circular, logo rectangular, ou icone conforme o tipo selecionado

### Comportamento por Defeito

Blocos Hero existentes que nao tenham `hero_media_type` definido continuarao a usar o icone (backward compatible).

### Resultado

O utilizador podera escolher entre 3 modos visuais para o topo do bloco Hero:
- **Icone**: icone Lucide com gradiente (actual)
- **Avatar**: foto circular com borda e sombra (ideal para perfis pessoais)
- **Logotipo**: imagem rectangular com cantos suaves (ideal para marcas)
