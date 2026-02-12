

# Fase 2: Desafio 7 Dias + Resultados (Prova Social)

Esta fase adiciona duas paginas novas ao FastClub: o **Desafio 7 Dias** (sequencia de micro-missoes de ativacao ligadas ao FastCRM) e a pagina **Resultados** (prova social com testemunhos, wins e metricas).

---

## O que esta incluido

### 1. Pagina "Desafio 7 Dias" (`/dashboard/fastclub/desafio-7-dias`)

Sequencia visual de 7 dias com micro-missoes praticas:
- Timeline vertical com 7 cards (um por dia), cada um com titulo, descricao, CTA para o FastCRM e estado (bloqueado/disponivel/concluido)
- Progresso visual no topo (barra + "Dia X de 7")
- Cada missao tem um botao de acao que aponta para uma funcionalidade real do FastCRM (deep-link)
- Os dados vem da tabela `fastclub_challenges` ja existente
- Dados semente: 7 missoes pre-carregadas (criar pipeline, registar contactos, enviar proposta, ativar automacao, etc.)
- Tabela `fastclub_challenge_progress` para guardar progresso do utilizador (dia completado, data)

### 2. Pagina "Resultados" (`/dashboard/fastclub/resultados`)

Pagina de prova social com 3 seccoes:
- **Metricas agregadas**: cards com numeros do ecossistema (membros ativos, oportunidades criadas, taxa de conversao) vindos da tabela `fastclub_crm_aggregates`
- **Casos de sucesso**: cards com estrutura "Problema - Acao - Resultado" (dados da tabela `fastclub_content_sections` com page_key = 'resultados')
- **Testemunhos curtos**: citacoes com nome, cargo e empresa (dados semente)
- CTA recorrente "Ativar FastCRM" em cada seccao

### 3. Migracao de base de dados

- Tabela `fastclub_challenge_progress` para tracking do progresso individual
- Dados semente: 7 challenges + 5 casos de sucesso + 4 metricas agregadas

### 4. Rotas e navegacao

- Adicionar rotas no App.tsx
- Atualizar items da Sidebar para incluir links ativos

---

## Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/pages/fastclub/DesafioPage.tsx` | Pagina Desafio 7 Dias com timeline e progresso |
| `src/pages/fastclub/ResultadosPage.tsx` | Pagina Resultados (prova social) |

## Ficheiros a editar

| Ficheiro | Acao |
|---|---|
| `src/App.tsx` | Adicionar 2 rotas novas |
| `src/components/layout/Sidebar.tsx` | Adicionar links para Desafio e Resultados |

---

## Detalhe tecnico

### Migracao DB

```sql
-- Progresso individual no Desafio 7 Dias
CREATE TABLE public.fastclub_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  challenge_id uuid REFERENCES fastclub_challenges(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.fastclub_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress"
  ON public.fastclub_challenge_progress FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
  ON public.fastclub_challenge_progress FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
```

### Dados semente

7 challenges na tabela `fastclub_challenges`:
- Dia 1: "Configurar o seu pipeline" (action: abrir pipeline)
- Dia 2: "Registar 5 contactos" (action: abrir contactos)
- Dia 3: "Criar a primeira oportunidade" (action: abrir oportunidades)
- Dia 4: "Enviar uma proposta" (action: abrir propostas)
- Dia 5: "Ativar uma automacao simples" (action: abrir automacoes)
- Dia 6: "Analisar os seus KPIs" (action: abrir reports)
- Dia 7: "Explorar a Rede Privada" (action: abrir FastMatch)

5 casos de sucesso na tabela `fastclub_content_sections` (page_key = 'resultados'):
- Estrutura: titulo, content (Problema/Acao/Resultado), metadata (empresa, setor, metrica)

### Pagina Desafio 7 Dias

- Barra de progresso no topo com contagem de dias concluidos
- Timeline vertical com cards animados (stagger, spring)
- Cada card mostra: numero do dia, titulo, descricao, botao CTA, estado (icone check se completo)
- Ao clicar "Marcar como concluido" insere registo em `fastclub_challenge_progress`
- Consulta challenges com `useQuery` + progresso do utilizador

### Pagina Resultados

- 3 seccoes com animacoes de entrada (fade + stagger)
- Metricas: 4 cards grandes com numeros vindos de `fastclub_crm_aggregates`
- Casos: cards com gradiente subtil e estrutura Problema/Acao/Resultado
- Testemunhos: citacoes com aspas, nome e cargo
- CTA final "Ativar FastCRM" com destaque visual
