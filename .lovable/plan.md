

# Templates Premium com IA para Bio OS

## Conceito

Criar uma galeria de templates premium pre-definidos que o utilizador pode aplicar com 1 clique, cada um optimizado para uma vertical/industria especifica. Os templates sao gerados via IA no momento da seleccao (usando o edge function `bio-ai-builder` existente), mas com parametros pre-configurados para garantir resultados de alta qualidade.

## O que sera criado

### 1. Galeria de Templates (`src/components/bio/BioTemplateGallery.tsx`)

Um dialog/modal com uma grelha visual de templates premium, cada um com:
- Card com preview visual (gradiente de cores + icone da industria)
- Nome do template (ex: "Coach de Fitness", "Restaurante Gourmet", "Consultora Imobiliaria")
- Descricao curta (1 linha)
- Indicador de vertical e tom
- Botao "Usar Template" que gera a pagina automaticamente

**Templates incluidos (12 templates em 4 categorias):**

| Categoria | Template | Cor | Tom |
|---|---|---|---|
| **Servicos** | Coach de Fitness | #16a34a | Energetico |
| | Consultoria de Negocios | #2563eb | Profissional |
| | Terapeuta / Wellness | #8b5cf6 | Elegante |
| **Comercio** | Restaurante Gourmet | #dc2626 | Casual |
| | Loja Online | #f59e0b | Divertido |
| | Salao de Beleza | #ec4899 | Elegante |
| **Criativo** | Fotografo Profissional | #1e1b4b | Minimalista |
| | Designer / Portfolio | #6366f1 | Profissional |
| | Musico / Artista | #7c3aed | Energetico |
| **Digital** | Agencia de Marketing | #0891b2 | Profissional |
| | Freelancer Tech | #059669 | Casual |
| | Influencer / Creator | #e11d48 | Divertido |

### 2. Integracao na pagina Bio OS (`src/pages/BioOS.tsx`)

- Adicionar botao "Templates Premium" ao lado dos botoes existentes
- O botao abre a galeria de templates
- Ao seleccionar um template, o sistema chama o `bio-ai-builder` com os parametros pre-configurados do template
- Mostra o mesmo ecrã de loading do BioAIWizard durante a geracao
- Apos geracao, abre directamente o builder da pagina

### 3. Fluxo do utilizador

```text
Bio OS --> [Templates Premium] --> Galeria (12 templates)
  --> Clica num template --> Loading com animacao
  --> Pagina criada --> Abre o Builder
```

## Detalhes tecnicos

### Ficheiro: `src/components/bio/BioTemplateGallery.tsx` (novo)

Componente principal com:
- Array de `PREMIUM_TEMPLATES` com parametros pre-definidos para cada template (vertical, objective, offer, tone)
- Dialog com grelha responsiva (2-3 colunas)
- Cards visuais com gradiente baseado na cor do template
- Estado de geracao com animacao (reutiliza o padrao do BioAIWizard)
- Chamada ao edge function `bio-ai-builder` existente (nao e necessario criar novo)
- Apos sucesso, cria a pagina e blocos usando os hooks existentes (`useCreateBioPage`, `useCreateBioBlock`)

Estrutura de cada template:
```typescript
interface PremiumTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string; // nome do icone Lucide
  color: string; // cor primaria hex
  params: {
    vertical: string;
    objective: string;
    offer: string;
    tone: string;
  };
}
```

### Ficheiro: `src/pages/BioOS.tsx` (modificar)

- Importar `BioTemplateGallery`
- Adicionar estado `templateGalleryOpen`
- Adicionar botao "Templates" com icone `LayoutGrid`
- Renderizar `BioTemplateGallery` com as mesmas props do `BioAIWizard` (open, onOpenChange, onPageCreated)

### Ficheiros a criar/modificar

| Ficheiro | Accao |
|---|---|
| `src/components/bio/BioTemplateGallery.tsx` | Criar -- galeria de 12 templates premium com geracao IA |
| `src/pages/BioOS.tsx` | Modificar -- adicionar botao e integrar galeria |

## Resultado esperado

- 12 templates premium organizados por categoria
- Geracao com 1 clique (sem wizard de 4 passos)
- Mesmo edge function `bio-ai-builder` reutilizado
- Cards visuais com cores e icones representativos
- Animacao de loading durante geracao
- Pagina pronta para editar apos geracao
