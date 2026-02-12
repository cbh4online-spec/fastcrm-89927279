

# FastClub Freemium -- Fase 1: Infraestrutura + Zona Publica

Dado o tamanho deste projeto, vamos entregar por fases incrementais. A Fase 1 foca em criar a infraestrutura de base de dados, o sistema de membership tiers (free/premium), a navegacao reestruturada com zonas publica e fechada, e as primeiras 3 paginas publicas: **Start Here**, **Metodo PARE** e **FastCRM em Acao**.

---

## O que esta incluido nesta fase

1. Migracao de base de dados:
   - Campo `membership_tier` na tabela `community_members` (valores: free, premium)
   - Campo `is_crm_verified` (boolean) para clientes FastCRM verificados
   - Tabela `fastclub_crm_aggregates` para indicadores vindos do CRM
   - Tabela `fastclub_content_sections` para conteudo estatico das paginas (Start Here, PARE, Demo)
   - Tabela `fastclub_challenges` para o Desafio 7 Dias (estrutura)
   - Dados semente iniciais (10 exemplos de conteudo dummy)

2. Hook `useFastClubMembership` para verificar tier do utilizador (visitor/free/premium/verified)

3. Reestruturacao da sidebar do FastClub com zonas separadas:
   - ZONA PUBLICA: Start Here, Metodo PARE, FastCRM em Acao, Desafio 7 Dias, Resultados, Discussao
   - ZONA FECHADA (com cadeado): Missao da Semana, Implementacao Guiada, IA Avancada, FastMatch Hub, Laboratorio Fast

4. Tres paginas novas:
   - `/dashboard/fastclub/start-here` -- Visao do ecossistema com CTAs
   - `/dashboard/fastclub/metodo-pare` -- Pagina P/A/R/E com conteudo estruturado
   - `/dashboard/fastclub/demos` -- FastCRM em Acao (biblioteca de demos curtas)

5. Componente `PremiumGate` -- bloqueia conteudo premium com overlay profissional e CTA de upgrade

---

## Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/hooks/useFastClubMembership.ts` | Hook para tier do utilizador (visitor/free/premium/verified) |
| `src/components/fastclub/PremiumGate.tsx` | Gate de acesso para conteudo premium |
| `src/components/fastclub/FastClubSidebar.tsx` | Sidebar dedicada com zonas publica/fechada |
| `src/pages/fastclub/StartHerePage.tsx` | Pagina "Start Here" |
| `src/pages/fastclub/MetodoParePage.tsx` | Pagina Metodo PARE (P/A/R/E) |
| `src/pages/fastclub/DemosPage.tsx` | FastCRM em Acao |

## Ficheiros a editar

| Ficheiro | Acao |
|---|---|
| `src/App.tsx` | Adicionar rotas novas |
| `src/components/layout/Sidebar.tsx` | Atualizar items do FastClub |

---

## Detalhe tecnico

### Migracao DB

```sql
-- Membership tier na community_members
ALTER TABLE public.community_members 
  ADD COLUMN membership_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN is_crm_verified boolean NOT NULL DEFAULT false;

-- Tabela de agregados do CRM (context bridge)
CREATE TABLE public.fastclub_crm_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  metric_key text NOT NULL,
  metric_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, metric_key)
);

ALTER TABLE public.fastclub_crm_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read aggregates"
  ON public.fastclub_crm_aggregates FOR SELECT
  TO authenticated USING (true);

-- Tabela de conteudo das seccoes
CREATE TABLE public.fastclub_content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  page_key text NOT NULL,
  section_key text NOT NULL,
  title text,
  content text,
  media_url text,
  media_type text DEFAULT 'image',
  sort_order int DEFAULT 0,
  is_premium boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fastclub_content_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read content"
  ON public.fastclub_content_sections FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage content"
  ON public.fastclub_content_sections FOR ALL
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = fastclub_content_sections.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Tabela do Desafio 7 Dias (estrutura para Fase 2)
CREATE TABLE public.fastclub_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  day_number int NOT NULL,
  title text NOT NULL,
  description text,
  action_label text,
  action_url text,
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fastclub_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read challenges"
  ON public.fastclub_challenges FOR SELECT
  TO authenticated USING (true);
```

### Dados semente (via insert tool apos migracao)

Inserir 10 exemplos de conteudo nas tabelas `fastclub_content_sections` e `fastclub_crm_aggregates` para que a UI pareca viva desde o primeiro dia.

### Hook useFastClubMembership

```typescript
// Retorna: { tier: 'visitor'|'free'|'premium', isCrmVerified, isLoading }
// Consulta community_members com membership_tier e is_crm_verified
```

### Sidebar reestruturada

A sidebar do FastClub passa a ter dois blocos visuais:
- **Aberto** (icone de globo): Start Here, Metodo PARE, FastCRM em Acao, Desafio 7 Dias, Resultados, Discussao, Forum
- **Premium** (icone de cadeado): Missao da Semana, Implementacao Guiada, IA Avancada, FastMatch Hub, Laboratorio

Os itens premium mostram um pequeno icone de cadeado e, ao clicar, mostram o PremiumGate se o utilizador nao for premium.

### PremiumGate

Componente empresarial (sem emojis, sem gamificacao infantil) com:
- Icone de escudo/lock
- Titulo: "Conteudo Exclusivo para Membros Premium"
- Descricao curta do que esta bloqueado
- Botao "Fazer Upgrade" com estilo corporativo
- Tom serio e profissional conforme requisitos

### Paginas publicas

Cada pagina usa cards executivos com dados estruturados, animacoes framer-motion subtis (fade-in, stagger), e CTAs recorrentes para o FastCRM. O Metodo PARE mostra os 4 pilares (P/A/R/E) em cards verticais com exemplos praticos aplicados ao FastCRM.

---

## Fases futuras (nao incluidas agora)

- **Fase 2**: Desafio 7 Dias + Resultados (prova social) + conteudo semente completo
- **Fase 3**: Zona Premium (Missao da Semana, Implementacao Guiada, IA Avancada)
- **Fase 4**: FastMatch Hub comunitario (6 canais do hub)
- **Fase 5**: Landing publica FastClub + integracao deep-link SSO com FastCRM
- **Fase 6**: Laboratorio Fast + Hot Seats + refinamentos finais

