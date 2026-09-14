# Separador Instagram da Lead — que informação mais pode mostrar

## Diagnóstico

Hoje o separador só mostra métricas se a lead já tiver dados recolhidos. Nesta lead
(`@diogotricologia`) não existe nenhuma métrica gravada, por isso aparece apenas o perfil
e o aviso de que faltam dados. Não existe, neste momento, nenhuma forma de recolher os
dados a partir da ficha da lead.

O sistema já tem tudo o que é necessário:
- uma função de recolha de perfil de Instagram (nome, foto, biografia, categoria,
  seguidores, a seguir, publicações, verificado, conta profissional, site externo) que
  hoje só grava em Prospeção Profissional;
- uma análise por IA de perfis de Instagram (tipo de negócio, especialidade, cidade,
  sinais de contacto, pontuação de lead com justificação);
- campos próprios na lead para guardar todas essas métricas.

## O que passa a aparecer no separador

1. **Cartão de perfil** — foto, nome, `@utilizador`, selo de verificado e de conta
   profissional, categoria, cidade quando existir.
2. **Métricas** — publicações, seguidores, a seguir, mais rácio seguidores/a seguir e
   média de publicações (indicadores simples de atividade).
3. **Biografia completa** e **site externo** (com ligação segura).
4. **Botão "Recolher dados do Instagram"** — vai buscar tudo em tempo real e guarda na
   lead; mostra estado de carregamento, sucesso e erro, e a data da última recolha com
   opção de atualizar.
5. **Leitura por IA do perfil** — tipo de negócio, especialidade, zona, sinais de
   contacto detetados na biografia (telefone, email, WhatsApp, link de marcações) e
   pontuação com a respetiva explicação. Executada só a pedido, com botão próprio.
6. **Ações rápidas** — abrir mensagens, abrir perfil, copiar `@utilizador`, e criar
   tarefa/nota de seguimento a partir do que foi encontrado.
7. **Conversas de Instagram associadas** — atalho para as mensagens já existentes desta
   lead no canal Instagram, quando existirem.

Estados vazios, carregamento, erro e ausência de perfil ficam todos tratados.
Nada é inventado: se a recolha não devolver um campo, esse campo não aparece.

## Detalhes técnicos

- Estender `supabase/functions/enrich-instagram-profile` para aceitar `leadId` e escrever
  nas colunas `instagram_*` de `leads` (`followers/following/posts_count`, `bio`,
  `external_url`, `category`, `is_verified`, `is_business`, `enriched_at`), além do
  comportamento atual de prospeção. Validação de JWT e de pertença ao workspace da lead
  antes de qualquer escrita; erros devolvidos com CORS e mensagem tratada.
- Novo hook `useLeadInstagramEnrichment` (mutação + invalidação da query da lead + toasts).
- Reescrever `src/components/leads/sections/InstagramDataSection.tsx` em subcomponentes:
  cabeçalho de perfil, grelha de métricas, biografia/links, painel de IA, ações.
- Análise IA através de `instagram-ai-analyze` (ação de perfil), com resultado guardado em
  campos personalizados/insights da lead para não se perder entre sessões.
- Registo em `leads_audit_log` de cada recolha (quem, quando, campos alterados).
- A recolha depende da chave `RAPIDAPI_KEY`, já configurada.
- Validação: `bunx tsgo --noEmit -p tsconfig.app.json`, testes existentes e verificação no
  browser da ficha da lead.

## Critérios de aceitação

- Com perfil preenchido e sem dados, o botão de recolha preenche as métricas e a data.
- Perfis privados ou inexistentes devolvem mensagem clara, sem apagar dados anteriores.
- Sem perfil de Instagram, o separador explica como o adicionar.
- Todos os links abrem em separador novo e nenhum link fica quebrado com `@utilizador`.
- Nenhuma escrita fora do workspace da lead.

## Riscos e pontos por validar

- A API externa pode limitar pedidos ou não expor cidade/contactos em contas privadas.
- Custo por chamada da API externa: a recolha fica sempre manual, nunca automática.
- Confirmar se quer também guardar a foto de perfil como avatar da lead.
