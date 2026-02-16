
# Wizard AI Bio Builder -- Redesign Dinamico e Engajador

## Objectivo
Transformar o wizard actual (dialog simples com badges estaticos) numa experiencia imersiva, animada e visualmente rica que transmita a sensacao de "magia da IA".

## Mudancas Principais

### 1. Layout Full-Screen em vez de Dialog Pequeno
- Substituir o `Dialog sm:max-w-md` por um overlay full-screen com fundo gradiente animado
- Centrar o conteudo com `max-w-lg` para manter foco
- Fundo com particulas/orbs animados subtis (CSS puro via gradients animados)

### 2. Transicoes Animadas entre Steps
- Usar `framer-motion` (ja instalado) com `AnimatePresence` para transicoes entre etapas
- Slide horizontal suave: step actual sai para a esquerda, novo entra pela direita
- Fade + scale nos elementos de cada step

### 3. Cards Seleccionaveis em vez de Badges
- Substituir os badges por cards visuais com icone + label
- Cada vertical/objectivo/tom tera um icone Lucide relevante (ex: Building2 para Imobiliario, Dumbbell para Fitness)
- Efeito hover com glow/border animado
- Seleccao com check animado e border primaria

### 4. Barra de Progresso Animada
- Substituir as barras simples por uma progress bar com label do step actual
- Numero do step com circulo animado
- Texto contextual: "Passo 1 de 4 -- O teu nicho"

### 5. Ecra de Geracao Imersivo
- Substituir o simples Loader2 por uma animacao rica:
  - Texto rotativo com frases motivacionais ("A criar o teu copy...", "A optimizar para conversao...", "A escolher as cores perfeitas...")
  - Icone central pulsante com glow
  - Barra de progresso simulada (fake progress para dar feedback visual)

### 6. Ecra de Sucesso
- Antes de redirecionar, mostrar brevemente um ecra de "Pagina criada!" com confetti visual (CSS) e resumo do que foi gerado

---

## Detalhes Tecnicos

### Ficheiro editado: `src/components/bio/BioAIWizard.tsx`
Reescrita completa do componente com:

- **Layout**: `Dialog` com `sm:max-w-2xl` e altura fixa, ou alternativa com overlay custom
- **Animacoes**: `motion.div` com `AnimatePresence` e `mode="wait"` para transicoes
- **Cards de opcao**: Grid 2x4 com `motion.button` que inclui icone + label + estado selected
- **Icones por vertical**:
  - Consultoria: Briefcase
  - Fitness: Dumbbell
  - Imobiliario: Building2
  - Tecnologia: Code
  - Saude: Heart
  - Educacao: GraduationCap
  - E-commerce: ShoppingBag
  - Restauracao: UtensilsCrossed
- **Icones por objectivo**:
  - Captar leads: Target
  - Vender produto: ShoppingCart
  - Agendar reuniao: Calendar
  - Portfolio: Layout
  - Branding pessoal: User
  - Comunidade: Users
- **Icones por tom**:
  - Profissional: Briefcase
  - Casual: Coffee
  - Energetico: Zap
  - Elegante: Crown
  - Minimalista: Minus
  - Divertido: Smile

- **Loading state**: Array de mensagens rotativas com `useEffect` + `setInterval` a cada 2.5s, progress bar simulada de 0 a 90% em ~15s
- **Sucesso**: Flash screen de 1.5s com icone CheckCircle2 animado antes de navegar

### Ficheiro: `src/pages/BioOS.tsx`
- Sem alteracoes necessarias (a interface do wizard e interna)

### Nenhuma alteracao de backend
- A edge function `bio-ai-builder` mantem-se igual
