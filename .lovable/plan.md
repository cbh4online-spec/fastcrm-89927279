
# Templates Premium com Conteudo Completo para Bio OS

## Problema

Os templates actuais dependem inteiramente da geracao por IA, que frequentemente produz paginas com pouco conteudo -- blocos quase vazios, apenas icone e textos genericos. O resultado e uma pagina "em branco" que nao impressiona.

## Solucao

Criar **templates estaticos pre-preenchidos** com conteudo real e completo (8-12 blocos cada), aplicados **instantaneamente** sem necessidade de chamada a IA. Cada template tera copy persuasivo, CTAs, secoes de features, testimonials, FAQ e redes sociais -- tudo pronto para editar.

## Alteracoes

### 1. Ficheiro: `src/components/bio/BioTemplateGallery.tsx` (reescrever)

Substituir a logica actual (que chama o edge function `bio-ai-builder`) por templates estaticos com blocos pre-definidos.

**Cada template passara a incluir:**
- `blocks[]` com 8-12 blocos completamente preenchidos (em vez de chamar a IA)
- Conteudo real e persuasivo em portugues de Portugal
- Aplicacao imediata (sem loading de IA)

**Estrutura de cada template:**

```text
PremiumTemplate {
  id, name, description, category, icon, color,
  pageName: string,
  slug: string,
  blocks: Array<{
    type: string,
    content: Record<string, any>
  }>
}
```

**Conteudo dos 12 templates (exemplo do "Coach de Fitness"):**

| # | Tipo | Conteudo |
|---|---|---|
| 1 | hero | Titulo: "Transforma o teu corpo em 90 dias" / Subtitulo: "Treinos personalizados..." / CTA: "Comecar Agora" / Icon: Dumbbell |
| 2 | feature | Titulo: "Treino Personalizado" / Subtitulo: "Planos adaptados ao teu nivel..." |
| 3 | feature | Titulo: "Acompanhamento Semanal" / Subtitulo: "Check-ins semanais com ajustes..." |
| 4 | feature | Titulo: "Plano Nutricional" / Subtitulo: "Orientacoes alimentares simples..." |
| 5 | text | Depoimento ou frase motivacional |
| 6 | button | "Marcar Avaliacao Gratuita" |
| 7 | testimonials | "Perdi 12kg em 3 meses..." -- Maria S. |
| 8 | divider | Separador visual |
| 9 | whatsapp | "Fala comigo no WhatsApp" + mensagem pre-escrita |
| 10 | social | Links Instagram, Facebook, YouTube |

Todos os 12 templates terao estrutura semelhante com conteudo especifico e relevante para cada vertical.

### 2. Logica de aplicacao

Substituir a chamada ao `bio-ai-builder` por criacao directa:
- Criar pagina com `createPage.mutateAsync()`
- Iterar pelos blocos estaticos e criar cada um com `createBlock.mutateAsync()`
- Sem loading de IA (apenas um spinner rapido durante a escrita na base de dados)
- Manter animacao de sucesso

### 3. Verticais com conteudo completo (12 templates)

Cada um com 8-12 blocos pre-escritos:

**Servicos:**
- Coach de Fitness -- treinos, transformacao corporal, avaliacao gratuita
- Consultoria de Negocios -- diagnostico, estrategia, ROI
- Terapeuta / Wellness -- equilibrio, sessoes, auto-cuidado

**Comercio:**
- Restaurante Gourmet -- menu, reservas, experiencia gastronomica
- Loja Online -- produtos, descontos, colecoes
- Salao de Beleza -- tratamentos, packs, transformacao

**Criativo:**
- Fotografo Profissional -- portfolio, sessoes, estilo
- Designer / Portfolio -- projectos, branding, processo criativo
- Musico / Artista -- musica, eventos, streaming

**Digital:**
- Agencia de Marketing -- auditoria, resultados, casos de estudo
- Freelancer Tech -- servicos, stack, orcamentos
- Influencer / Creator -- conteudo, parcerias, media kit

## Ficheiros a modificar

| Ficheiro | Accao |
|---|---|
| `src/components/bio/BioTemplateGallery.tsx` | Reescrever -- templates estaticos com blocos pre-preenchidos, remover chamada IA |

## Resultado esperado

- Templates aplicados instantaneamente (sem esperar pela IA)
- Cada pagina criada com 8-12 blocos de conteudo real e completo
- Preview imediatamente visivel com textos, CTAs, testimonials e redes sociais
- Conteudo editavel pelo utilizador apos aplicacao
- Zero dependencia de chamadas API para templates premium
