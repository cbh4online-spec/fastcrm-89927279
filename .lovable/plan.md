# Extrator de perfis de Instagram na Prospeção (estilo Growman)

## Diagnóstico

O projeto já tem quase tudo o que este extrator precisa, mas nada disto está ligado num
fluxo de recolha em massa:

- ligação à API de Instagram (`instagram-api-proxy`) com as operações de pesquisa, perfil,
  publicações, hashtag e localização, já com controlo de utilização diária;
- recolha de perfil individual (`enrich-instagram-profile`) que devolve nome, foto,
  biografia, site, seguidores, a seguir, publicações, categoria, verificado e profissional;
- leitura por IA (`instagram-ai-analyze`): tipo de negócio, especialidade, zona, sinais de
  contacto, pontuação da lead com justificação;
- tabela de resultados de prospeção (`professional_prospecting_profiles`) que já tem
  colunas para todas as métricas de Instagram, email e telefone extraídos, análise de IA,
  pontuação e ligação à lead criada.

O que falta é o motor de listagem em massa (seguidores / a seguir) e o ecrã de trabalho com
tabela, exportação e importação para Leads.

## O que vai ser criado

### 1. Novo ecrã: Prospeção → Extrator de Instagram

Um único ecrã de trabalho com:

- **Origem** — quatro modos: seguidores de um perfil, quem um perfil segue, hashtag ou
  localização, e lista de `@perfis` colada à mão (um por linha).
- **Limites do trabalho** — quantos perfis recolher (até milhares), com aviso claro de que
  cada consulta tem custo e mostrando o consumo do dia.
- **Progresso ao vivo** — "a recolher 231 de 3169", com pausar, retomar e cancelar; o
  trabalho continua mesmo que feche o ecrã.
- **Tabela de resultados** — foto, `@utilizador`, nome, seguidores, a seguir, publicações,
  email, telefone, cidade, biografia, categoria, pontuação da lead, e marca de "já existe
  como lead". Com pesquisa, ordenação, filtros (mínimo de seguidores, tem email, tem
  telefone, categoria, pontuação) e paginação.
- **Exportar** para Excel/CSV: tudo ou apenas o que está filtrado/selecionado.
- **Importar como Leads**: selecionados ou todos os filtrados, com deduplicação por
  `@perfil`, email e telefone, escolha de origem/etiquetas e responsável.
- **Analisar com IA**: em lote sobre os selecionados, escrevendo tipo de negócio,
  especialidade, zona, sinais de contacto e pontuação.

### 2. Recolha em segundo plano

A recolha corre por lotes numa fila no servidor, com registo de progresso, retoma sem
repetir trabalho e paragem automática se a API ou os créditos falharem. Nada é recolhido
sozinho: só arranca quando o utilizador cria o trabalho.

### 3. Contactos e nada inventado

Email e telefone são extraídos apenas do que o perfil publica na biografia (padrões de
email, telefone PT/internacional, WhatsApp, `linktr.ee` e afins). Se não existir, o campo
fica vazio — nunca é preenchido por estimativa. Perfis privados ficam registados como tal.

## Detalhes técnicos

- **Base de dados**: nova tabela `instagram_extraction_jobs` (origem, alvo, limite, estado,
  processados, encontrados, cursor da API, erro, criado por) e
  `instagram_extraction_items` (fila por `@utilizador`, estado, tentativas, único por
  trabalho + utilizador). Os perfis recolhidos são gravados em
  `professional_prospecting_profiles` (`platform = 'instagram'`), reutilizando as colunas
  `instagram_*`, `extracted_email`, `extracted_phone`, `ai_analysis`, `lead_score` e
  `converted_lead_id`. RLS por `workspace_id` com `has_workspace_access`, GRANTs para
  `authenticated` e `service_role`, escrita de progresso só via `service_role`.
- **Edge Functions**:
  - `instagram-extract-start` — valida entrada com zod, verifica pertença ao workspace e
    papel (viewer não recolhe), cria o trabalho e semeia a fila;
  - `instagram-extract-worker` — lote limitado por execução, *single-flight* por lease,
    progresso idempotente, respeito por `Retry-After`/429, corte imediato em 402/403, e
    próxima passagem só se houver trabalho pendente;
  - `instagram-extract-control` — pausar, retomar, cancelar;
  - extensão do `instagram-api-proxy` com `followers` e `following` (paginação por cursor).
- **Extração de contactos**: `src/lib/instagram/extractContacts.ts` puro, com testes
  (emails, telefones PT/E.164, WhatsApp, ruído de bio).
- **Frontend**: `src/pages/ProspectingInstagramExtractor.tsx` + rota em
  `ProspectingRoutes.tsx` e cartão no `ProspectingHub`; hooks
  `useInstagramExtractionJobs`, `useInstagramExtractionResults` (paginação no servidor),
  `useInstagramExtractionImport`; tabela virtualizada para milhares de linhas; exportação
  com o utilitário `excelUtils` existente.
- **IA** em lote pela `instagram-ai-analyze` já existente, gravando em `ai_analysis`.
- **Auditoria**: cada trabalho, importação e exportação registados em `activity_logs`.
- **Validação**: `bunx tsgo --noEmit -p tsconfig.app.json`, testes de extração de contactos
  e de deduplicação, build de produção e ensaio real com um perfil pequeno.

## Critérios de aceitação

- Um trabalho de seguidores de um perfil grande recolhe por lotes, mostra progresso, pode
  ser pausado e retomado, e não duplica perfis.
- Cada perfil recolhido mostra apenas dados públicos reais; campos ausentes ficam vazios.
- Filtros, ordenação, pesquisa e paginação funcionam com milhares de linhas sem travar.
- A exportação respeita a seleção/filtros e abre corretamente no Excel.
- A importação cria Leads sem duplicar as que já existem e liga o perfil à lead criada.
- Nenhum dado é visível ou gravado fora do workspace atual; viewers não podem recolher nem
  importar.
- Falhas da API ou de créditos param o trabalho com mensagem clara, sem perder o já feito.

## Riscos e pontos por validar

- **Custo e limites**: listar milhares de seguidores são milhares de consultas à API
  externa. Sugiro um limite por trabalho e um teto diário por workspace, configuráveis.
- A API pode não expor cidade nem contactos de contas privadas.
- Recolhas muito grandes podem levar horas; o trabalho corre por lotes agendados.
- Confirmar se quer também guardar a foto do perfil como avatar da lead importada.
- Confirmar o teto diário desejado por workspace.
