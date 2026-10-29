# Ecrã de entrada FastCRM — recriar o estilo MIA a sério

## O que falhou na versão anterior
- Lado esquerdo claro e genérico. A MIA usa um painel escuro petróleo com campos escuros.
- Lado direito com azul chapado. A MIA usa uma fotografia real, escurecida, com véu azul-petróleo.
- Títulos com letra comum. A MIA usa uma letra serifada elegante nos títulos e nos números.
- Faltavam pormenores: botão com brilho, lista numerada 01/02/03, linha divisória com estatísticas e frase de assinatura.

## O que vamos fazer (só o aspeto; a entrada em si continua igual)
1. **Fundo cinematográfico**: gerar uma fotografia de um profissional comercial num escritório moderno, com portátil/dashboard, em tons frios. Fica escurecida com um véu petróleo, sem cores berrantes.
2. **Painel esquerdo (38%) escuro**, igual ao da MIA:
   - logótipo FastCRM sobre um selo claro, com a etiqueta «CRM · VENDAS COM IA» e o seletor PT;
   - título serifado «Bem-vindo de volta»;
   - campos escuros, palavra-passe com botão para mostrar;
   - botão «Entrar» azul-ciano com brilho;
   - ligações sublinhadas «Esqueci-me da palavra-passe», depois «OU», «Continuar com Google» / «Apple»;
   - rodapé «Ainda não tem conta? Criar conta grátis · Ver planos · Ver tutoriais».
3. **Montra direita (62%)**:
   - pílula no topo «FastCRM Core · Motor de vendas ativo» com ponto verde;
   - retículo circular com brilho e nós coloridos (leads no funil);
   - cartão translúcido «INDICADORES COMERCIAIS» com barras e estado (Equilibrado / Atenção);
   - lista numerada 01 Pipeline · 02 WhatsApp Pro · 03 Faturação SAF-T;
   - destaque «✦ VENDAS E FATURAÇÃO COM INTELIGÊNCIA ARTIFICIAL», título serifado grande «Feche negócios como nunca fechou.», texto curto;
   - linha divisória, estatísticas serifadas e frase em itálico à direita.
4. **Telemóvel**: só o painel escuro com o formulário, com uma faixa da fotografia no topo.
5. **Também em**: Esqueci-me da palavra-passe e Criar conta (usam o mesmo enquadramento).

## Pontos para confirmar
- Os números da montra são ilustrativos. Se tiver valores reais, substituímos.

## Detalhes técnicos
- `AuthLayout.tsx` reescrito; `LoginForm.tsx` só recebe classes de estilo escuras (mesma lógica, mesmos handlers).
- Novos tokens em `index.css` (`--auth-surface`, `--auth-glow`) e fonte serifada (Cormorant Garamond) só nos títulos do ecrã de entrada.
- Imagem gerada em `src/assets/auth-hero.jpg`.
- Validação com Playwright em 1440px e 390px, consola limpa.
