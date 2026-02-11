
# Sistema Completo de Tracking e Classificacao IA para a Loja

## Visao Geral

Criar um sistema de tracking completo que registe cada visita a loja (homepage e produtos), identifique e classifique visitantes com IA, e alimente automaticamente o CRM para converter "cada visita numa venda".

## O Que Existe Hoje

- Tabela `store_page_views` com campos: workspace_id, product_id, session_id, created_at
- Tracking apenas na pagina de produto individual (StoreProductViewTracker)
- Nao ha tracking na homepage da loja
- Nao ha registo de informacoes do visitante (referrer, device, paginas vistas)
- Nao ha classificacao IA dos visitantes
- Nao ha ligacao automatica entre sessoes anonimas e contactos do CRM

## Plano de Implementacao

### 1. Nova Tabela: `store_visitor_sessions`

Registar cada sessao de visitante com dados comportamentais enriquecidos:

| Campo | Tipo | Descricao |
|---|---|---|
| id | uuid | PK |
| workspace_id | uuid | FK workspaces |
| session_id | text | ID da sessao (localStorage) |
| contact_id | uuid | FK contacts (quando identificado) |
| first_page | text | Primeira pagina visitada |
| referrer | text | De onde veio (Google, Instagram, etc.) |
| utm_source/medium/campaign | text | Parametros UTM |
| device_type | text | desktop/mobile/tablet |
| pages_viewed | integer | Total de paginas vistas |
| products_viewed | text[] | Array de product_ids vistos |
| time_on_site_seconds | integer | Tempo total no site |
| started_at | timestamptz | Inicio da sessao |
| last_activity_at | timestamptz | Ultima atividade |
| ai_intent | text | Classificacao IA (browsing/comparing/ready_to_buy/returning) |
| ai_score | integer | Score de intencao de compra (0-100) |
| ai_recommendation | text | Proxima acao recomendada pela IA |
| ai_classified_at | timestamptz | Quando foi classificado |
| converted | boolean | Se resultou em compra |

### 2. Componente: `StoreVisitorTracker`

Componente global montado no layout da loja (StorePage + StoreProductPage) que:
- Cria/atualiza a sessao do visitante na tabela `store_visitor_sessions`
- Captura referrer, UTM params, device type automaticamente
- Regista cada pagina e produto visto
- Calcula tempo no site (heartbeat a cada 30s)
- Envia dados ao backend via upsert por session_id

### 3. Edge Function: `store-classify-visitor`

Funcao que classifica visitantes com IA (Gemini Flash):

**Input:** Dados da sessao (paginas vistas, produtos, tempo, referrer, historico CRM se existir)

**Output:**
- `ai_intent`: browsing / comparing / ready_to_buy / returning_customer
- `ai_score`: 0-100 (intencao de compra)
- `ai_recommendation`: Acao concreta (ex: "Enviar cupao de 10% para produto X", "Ativar chat proativo")

**Triggers de classificacao:**
- Visitante viu 3+ produtos
- Visitante passou 2+ minutos num produto
- Visitante voltou ao site (sessao recorrente)
- Visitante adicionou produto ao carrinho sem comprar

### 4. Automacao "Cada Visita Uma Venda"

Novos triggers no sistema de automacao (`useStoreAutomation`):

| Trigger | Condicao | Acao Sugerida |
|---|---|---|
| `visitor_high_intent` | ai_score >= 70 | Ativar chat IA proativo com oferta |
| `visitor_returning` | Mesmo session_id, 2a+ visita | Enviar mensagem personalizada |
| `visitor_product_interest` | 2+ views no mesmo produto | Criar alerta de preco/stock |
| `visitor_comparing` | 3+ produtos da mesma categoria | Enviar comparativo por email |
| `visitor_idle` | 5min+ numa pagina sem acao | Popup com oferta especial |

Cada evento gera um registo em `store_automation_events` que o motor de automacao existente processa.

### 5. Dashboard de Visitantes

Novo separador "Visitantes" no analytics da loja com:
- Visitantes em tempo real (ultimas 24h)
- Funil: Visita -> Produto -> Carrinho -> Compra
- Top visitantes classificados pela IA (com score)
- Sessoes recorrentes vs novas
- Origem do trafego (UTM/referrer)

## Seccao Tecnica

### Ficheiros a criar

| Ficheiro | Descricao |
|---|---|
| `src/components/store/StoreVisitorTracker.tsx` | Componente de tracking global com heartbeat, captura de UTM/referrer/device |
| `supabase/functions/store-classify-visitor/index.ts` | Edge function com Gemini Flash para classificar intencao do visitante |
| `src/hooks/useStoreVisitorTracking.ts` | Hook com logica de sessao, upsert e trigger de classificacao |
| `src/hooks/useStoreVisitorAnalytics.ts` | Hook para dashboard de visitantes |

### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/pages/store/StorePage.tsx` | Adicionar `StoreVisitorTracker` |
| `src/pages/store/StoreProductPage.tsx` | Adicionar `StoreVisitorTracker` e reportar produto visto |
| `src/hooks/useStoreAutomation.ts` | Adicionar triggers de visitante (visitor_high_intent, etc.) |

### Migracao SQL

```text
CREATE TABLE store_visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  session_id text NOT NULL,
  contact_id uuid REFERENCES contacts(id),
  first_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text DEFAULT 'desktop',
  pages_viewed integer DEFAULT 1,
  products_viewed text[] DEFAULT '{}',
  time_on_site_seconds integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  last_activity_at timestamptz DEFAULT now(),
  ai_intent text,
  ai_score integer,
  ai_recommendation text,
  ai_classified_at timestamptz,
  converted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, session_id)
);

-- RLS: leitura publica para insert (anonimo), leitura restrita para dashboard
ALTER TABLE store_visitor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert" ON store_visitor_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update own session" ON store_visitor_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Allow service role full access" ON store_visitor_sessions
  FOR ALL USING (true);

-- Index para queries do dashboard
CREATE INDEX idx_store_visitor_sessions_workspace 
  ON store_visitor_sessions(workspace_id, last_activity_at DESC);

CREATE INDEX idx_store_visitor_sessions_session 
  ON store_visitor_sessions(workspace_id, session_id);

CREATE INDEX idx_store_visitor_sessions_score 
  ON store_visitor_sessions(workspace_id, ai_score DESC NULLS LAST);
```

### Fluxo do Tracking

```text
Visitante entra na loja
        |
  StoreVisitorTracker monta
        |
  Captura: referrer, UTM, device
        |
  Upsert em store_visitor_sessions
        |
  Heartbeat a cada 30s (atualiza tempo)
        |
  Cada produto visto -> atualiza products_viewed[]
        |
  Threshold atingido? (3+ produtos, 2min+, etc.)
        |
  Chama store-classify-visitor (edge function)
        |
  IA classifica intencao e score
        |
  Score >= 70? -> Cria store_automation_event
        |
  Motor de automacao processa evento
        |
  Acao: chat proativo, popup, email, etc.
```

### Edge Function: store-classify-visitor

Usa o modelo `google/gemini-2.5-flash-lite` (rapido e economico) com um prompt que recebe:
- Paginas visitadas e tempo em cada uma
- Produtos vistos e categorias
- Referrer e UTM
- Historico CRM do contacto (se identificado)

E retorna a classificacao estruturada em JSON.
