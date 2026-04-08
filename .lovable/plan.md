## Área de Afiliados FastCRM — Plano de Implementação

### 1. Página Pública de Recrutamento (`/affiliates`)

Landing page de alta conversão para atrair novos afiliados:

- **Hero Section**: Headline impactante ("Ganhe comissões recorrentes a promover o FastCRM"), CTA principal de inscrição
- **Secção de Benefícios**: Comissões lifetime recorrentes, cookie de 30 dias, multinível (2 níveis), materiais de marketing gratuitos
- **Como Funciona**: 3 passos visuais (Inscrever → Partilhar → Ganhar)
- **Calculadora de Ganhos**: Simulador interativo (nº de referidos × plano × meses = ganhos estimados)
- **Testemunhos/Social Proof**: Espaço para top afiliados e resultados
- **FAQ**: Perguntas frequentes sobre o programa
- **Formulário de inscrição**: Integrado com o sistema existente `useRegisterAffiliate`

### 2. Portal do Afiliado Melhorado (`/dashboard/affiliates`)

Reestruturação do dashboard existente com foco em engagement:

- **Dashboard Visual**: KPIs com gráficos de tendência (cliques, conversões, receita ao longo do tempo)
- **Leaderboard/Rankings**: Top 10 afiliados do mês (anonimizado parcialmente)
- **Sistema de Metas**: Metas progressivas com badges (Bronze: 5 vendas, Prata: 20, Ouro: 50, Diamante: 100)
- **Centro de Materiais**: Banners, links pré-prontos, textos sugeridos para redes sociais, email templates
- **Gerador de Links Inteligente**: Pré-preenchido com URLs do FastCRM (pricing, landing, funcionalidades)
- **Notificações em Tempo Real**: Alertas de novas conversões e pagamentos
- **Referral Tree**: Visualização de sub-afiliados (se multinível activo)

### 3. Modelo de Comissão Destacado

- **Recorrente lifetime**: O afiliado ganha em cada renovação do cliente referido
- Percentagem configurável no admin (default 20% recorrente)
- Destaque visual na landing page com calculadora de ganhos recorrentes

### Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|----------|-------|
| `src/pages/public/AffiliatePublicPage.tsx` | **Criar** — Landing page pública |
| `src/pages/AffiliateDashboardPage.tsx` | **Reescrever** — Portal com engagement |
| `src/components/affiliates/AffiliateEarningsCalculator.tsx` | **Criar** — Calculadora interativa |
| `src/components/affiliates/AffiliateLeaderboard.tsx` | **Criar** — Rankings |
| `src/components/affiliates/AffiliateMaterialsCenter.tsx` | **Criar** — Centro de materiais |
| `src/components/affiliates/AffiliateAchievements.tsx` | **Criar** — Sistema de metas/badges |
| `src/routes/AffiliateRoutes.tsx` | **Modificar** — Adicionar rota pública |

### Sem alterações de base de dados
O sistema existente de tabelas (affiliates, affiliate_links, affiliate_conversions, affiliate_payouts, affiliate_balances) já suporta todas estas funcionalidades.
