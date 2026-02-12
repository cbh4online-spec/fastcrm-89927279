

# Redesign Completo da Landing Page FastCRM - Modelo AIDA

## Objetivo

Reescrever o ficheiro `src/pages/MarketingHomepage.tsx` (426 linhas) com o novo posicionamento estrategico: FastCRM como Infraestrutura Digital para Empresas Modernas, seguindo o modelo AIDA com 8 seccoes.

## Estrutura da Nova Landing (8 Seccoes)

### Header
- Navegacao atualizada com links para as novas seccoes: Ecossistema, FastClub, Rede Privada, Planos
- Botoes "Entrar" e "Comecar Agora"

### 1. Hero (Atencao)
- Titulo: "Infraestrutura Digital para Empresas Modernas"
- Subtitulo: "Organize. Automatize. Conecte." + texto complementar
- CTA primario: "Comecar Agora" (link para /auth)
- CTA secundario: "Explorar o Ecossistema" (scroll para seccao solucao)
- Visual limpo, sem badge informal, sem emojis

### 2. Problema (Interesse)
- Titulo: "A maioria das empresas opera com sistemas fragmentados."
- Lista de 5 problemas em blocos visuais com icones (sem emojis)
- Frase de fecho: "O resultado e ineficiencia e crescimento limitado."

### 3. Solucao (Interesse)
- Titulo: "Uma infraestrutura integrada."
- 3 cards visuais lado a lado:
  - CRM: Estrutura operacional. Leads, pipeline, controlo e metricas.
  - IA: Automacao inteligente. Sugestoes estrategicas. Assistentes integrados.
  - Rede Privada: Oportunidades qualificadas. Matching estrategico. Reputacao e metricas de ROI.
- CTA intermedio: "Ver como funciona"

### 4. FastClub (Desejo)
- Seccao nova e dedicada com fundo diferenciado
- Titulo: "O ecossistema nao termina no software."
- Texto sobre o FastClub como centro estrategico
- Enfase: "Nao e um grupo informal. E um espaco estruturado para execucao e crescimento."
- Botao: "Aceder ao FastClub" (link para /fastclub)

### 5. Rede Privada (Desejo)
- Titulo: "Rede Privada de Oportunidades"
- Texto explicativo sobre matching e integracao com CRM
- 3 indicadores numericos em destaque:
  - 84 oportunidades geradas esta semana
  - 12 novos membros verificados
  - Taxa media de resposta: 86%
- CTA: "Explorar a Rede Privada"

### 6. Prova Social (Desejo)
- Titulo: "Resultados Reais"
- 3 blocos com estrutura: Contexto / Acao / Resultado
- Estilo case study, sem aspas de testimonial informal

### 7. Planos (Acao)
- Titulo: "Escolha a infraestrutura certa para o seu negocio."
- 3 cards de planos com:
  - Quota mensal de matches
  - Acesso CRM, IA, FastClub, Rede
- CTA: "Comecar"

### 8. Encerramento (Acao)
- Titulo: "Construa sobre infraestrutura. Nao sobre improviso."
- 3 frases curtas
- Botao principal: "Iniciar Infraestrutura Digital"

### Footer
- Mantido e atualizado com links coerentes

## Detalhe Tecnico

| Ficheiro | Alteracao |
|---|---|
| `src/pages/MarketingHomepage.tsx` | Reescrita completa (~550 linhas). Mesma rota `/`, mesmas importacoes base (Button, Card, Link, icones Lucide). Sem dependencias novas. |

### Principios de Design
- Espacamento generoso (py-24, py-32)
- Paleta: primary gradient, muted backgrounds, sem cores vivas
- Tipografia: tracking-tight, tamanhos progressivos
- Cards com border-border/50, hover subtle
- Indicadores numericos com text-4xl/5xl font-bold
- CTAs repetidos estrategicamente com estilo consistente
- Zero emojis, zero linguagem informal

1 ficheiro editado. Sem migracoes SQL. Sem novos componentes.

