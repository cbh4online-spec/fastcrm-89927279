

# Quiz Detalhado com IA para Criação de eBook

## Diagnóstico

O passo 1 actual ("Conteúdo") pede apenas um prompt livre + tom + nº capítulos + modo. Isto resulta em eBooks genéricos porque a IA não tem contexto suficiente sobre público-alvo, objectivo, nível de profundidade, formato preferido, etc.

## Proposta

Substituir o passo 1 por um quiz estruturado de 2 sub-passos, mantendo os 4 steps do wizard mas expandindo o step "Conteúdo" com perguntas guiadas:

**Step 1A — Tema & Objectivo** (substitui o textarea actual)
- **Tema do eBook** (textarea, mantém-se)
- **Público-alvo**: chips seleccionáveis (Empreendedores, Gestores, Estudantes, Profissionais de Marketing, Desenvolvedores, Outro)
- **Objectivo principal**: chips (Educar, Gerar leads, Posicionar autoridade, Vender produto/serviço, Onboarding)
- **Nível de profundidade**: 3 opções (Introdutório, Intermédio, Avançado)

**Step 1B — Estrutura & Estilo** (mantém chapCount, tone, mode + adiciona)
- **Capítulos** e **Tom** (já existentes)
- **Modo** (já existente)
- **Elementos especiais**: multi-select chips (Estudos de caso, Estatísticas, Checklists, Templates práticos, Citações, Exercícios)
- **Palavras-chave**: input de tags para termos que devem aparecer no conteúdo

Todos estes dados são passados à edge function `ebook-ai-assist` no payload do `generate_outline` para contexto enriquecido.

## Estrutura do Wizard Atualizado

```text
Steps: [Template] → [Tema] → [Estrutura] → [Visual] → [Imagens]
         0            1          2            3          4
```

O wizard passa de 4 para 5 steps, dividindo "Conteúdo" em "Tema" e "Estrutura".

## Implementação

### Ficheiro: `EbookWizard.tsx`

1. **Novos estados**: `audience`, `objective`, `depth`, `specialElements`, `contentKeywords`
2. **Steps array**: Adicionar step extra — `[Template, Tema, Estrutura, Visual, Imagens]`
3. **Step 1 (Tema)**: Textarea do tema + chips para público-alvo, objectivo, profundidade
4. **Step 2 (Estrutura)**: Capítulos, tom, modo, elementos especiais, palavras-chave
5. **Step 3**: Tema visual (antigo step 2)
6. **Step 4**: Imagens + custo (antigo step 3)
7. **Payload do generate_outline**: Enviar `audience`, `objective`, `depth`, `specialElements`, `contentKeywords` para a edge function

### Ficheiro: `supabase/functions/ebook-ai-assist/index.ts`

Atualizar o prompt do `generate_outline` para incorporar os novos campos no system prompt, gerando estruturas mais precisas e contextualizadas.

## Microcopy

| Campo | Label | Placeholder/Hint |
|---|---|---|
| Tema | "Sobre o que é o seu eBook?" | "Ex: Guia completo sobre produtividade..." |
| Público | "Para quem é este eBook?" | Chips seleccionáveis |
| Objectivo | "Qual o objectivo principal?" | Chips seleccionáveis |
| Profundidade | "Nível de profundidade" | Introdutório / Intermédio / Avançado |
| Elementos | "Elementos especiais a incluir" | Multi-select chips |
| Keywords | "Palavras-chave do conteúdo" | "Adicione termos relevantes..." |

## Critérios de Aceitação

- Quiz tem 2 sub-passos claros (Tema + Estrutura) em vez de 1 passo denso
- Todos os novos campos são opcionais excepto o tema (já obrigatório)
- Os dados do quiz são enviados à edge function e influenciam o outline gerado
- Step indicator actualizado para 5 steps
- Navegação entre steps mantém-se fluida com animações
- Validação: step Tema requer prompt > 10 chars (já existe); step Estrutura não bloqueia
- Mobile responsivo: chips fazem wrap correctamente

