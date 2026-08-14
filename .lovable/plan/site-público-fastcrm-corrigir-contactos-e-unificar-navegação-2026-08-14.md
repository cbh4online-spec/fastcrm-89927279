# Site público FastCRM — corrigir contactos e unificar navegação

## Diagnóstico (verificado no código)

1. **Dados de contacto errados** — `MarketingContactPage.tsx` mostra `vendas@vendesimples.com`, telefone "+351 (consultar via formulário)" e "WhatsApp Business disponível" (texto morto, sem link). Nada disto corresponde ao FastCRM.
2. **Dois sistemas de navegação a coexistir** — a home `/` e `/fastcrm-whatsapp-sales` usam `HeaderV2` + `FooterV2` (menu: Produto, Módulos, Método PARE, Casos de uso, Preços, Contacto). As páginas `/precos`, `/funcionalidades`, `/casos`, `/sobre`, `/contacto` usam `MarketingLayout` (menu: Início, WhatsApp Sales, Funcionalidades, Preços, Casos de Uso, Sobre, Contacto). Visualmente e estruturalmente são sites diferentes.
3. **Links partidos**:
   - `MarketingLayout` tem "Entrar" a apontar para `/app` — rota que não existe no `App.tsx` (dá página em branco/404). O correto é `/auth`.
   - `HeaderV2` e `FooterV2` usam âncoras (`#solucao`, `#modulos`, `#metodo`, `#casos`, `#cta`). Essas secções só existem na home, por isso "Método PARE", "Módulos" e "Agendar demonstração" não fazem nada quando o utilizador está noutra página (ex.: `/fastcrm-whatsapp-sales`, que é onde o problema foi visto).
   - `HeaderV2` chama "Produto" a `#solucao` e o `MarketingLayout` não tem "Método PARE" — a taxonomia não bate certo entre os dois menus.
4. **Home duplicada** — existe `MarketingHomePage.tsx` (não usada em nenhuma rota) com conteúdo e números diferentes ("mais de 800 equipas") da landing ativa. Fonte de confusão e de mensagens contraditórias.

## Decisões

- Menu único, estilo landing (`HeaderV2` + `FooterV2`), aplicado a **todas** as páginas públicas.
- `/fastcrm-whatsapp-sales` mantém-se como item de topo ("WhatsApp Sales").
- Email de contacto: **online@metodopare.ai**. Telefone e WhatsApp ficam de fora enquanto não houver número oficial (melhor não mostrar do que mostrar placeholder).

## Plano de implementação

### 1. Corrigir a página de contacto
- Substituir `vendas@vendesimples.com` por `online@metodopare.ai` (mailto).
- Remover a linha de telefone com placeholder e a linha de WhatsApp sem link.
- Adicionar tempo de resposta e identificação da entidade (Simples & Divertido, Lda), coerente com o rodapé.
- Verificar que o formulário (`LeadForm`) grava corretamente e mostra confirmação; o link "política de privacidade" passa a ligar a `/privacy`.

### 2. Menu público único
- Reescrever `src/config/publicNavigation.ts` como fonte única: Início · WhatsApp Sales · Funcionalidades · Método PARE · Preços · Casos de Uso · Sobre · Contacto — todos com URL real (sem âncoras).
- `HeaderV2` e `FooterV2` passam a ler dessa configuração; deixam de ter links hardcoded.
- Substituir âncoras por rotas: "Método PARE" e "Módulos" passam a apontar para secções da home via link com hash absoluto (`/#metodo`), que funciona a partir de qualquer página, com scroll suave ao chegar.
- CTA "Agendar demonstração" passa a apontar sempre para `/contacto?tipo=demo` (deixa de ser `#cta`).
- "Entrar" aponta para `/auth` em todo o lado (corrige o 404 de `/app`).

### 3. Aplicar o layout único
- `MarketingLayout` passa a usar `HeaderV2` + `FooterV2`, mantendo o `<Outlet />`; as páginas `/precos`, `/funcionalidades`, `/casos`, `/sobre`, `/contacto` herdam o mesmo cabeçalho e rodapé da home.
- `/fastcrm-whatsapp-sales` continua com o mesmo header/footer (já usa), agora com os links corrigidos.
- Assinalar `MarketingHomePage.tsx` como legado (não roteada) para evitar futura confusão de conteúdos.

### 4. Verificação de todas as ligações públicas
- Percorrer com Playwright as rotas `/`, `/fastcrm-whatsapp-sales`, `/funcionalidades`, `/precos`, `/casos`, `/sobre`, `/contacto`, `/privacy`, `/terms`, `/cookies` e confirmar: sem 404, sem erros de consola, âncoras a funcionar a partir de outra página, CTAs a chegar ao formulário.
- Confirmar coerência de rodapé (mesmos grupos de links em todas as páginas) e menu mobile.

## Detalhes técnicos

Ficheiros a alterar:
- `src/marketing/pages/MarketingContactPage.tsx` (dados de contacto)
- `src/config/publicNavigation.ts` (SSoT do menu, sem âncoras soltas)
- `src/components/landing-fastcrm-v2/HeaderV2.tsx` e `Sections3.tsx` (FooterV2) — ler da config, CTA para `/contacto?tipo=demo`
- `src/marketing/layout/MarketingLayout.tsx` — passa a compor `HeaderV2`/`FooterV2`
- Pequeno helper de scroll para hash em navegação entre rotas

Sem alterações de base de dados, RLS ou lógica de negócio. Só navegação, conteúdo e apresentação.

## Critérios de aceitação

- `/contacto` mostra apenas contactos reais do FastCRM (`online@metodopare.ai`), sem referências ao VendeSimples.
- O mesmo cabeçalho e rodapé em todas as páginas públicas.
- Nenhum link do menu ou rodapé dá 404 ou fica sem efeito, incluindo "Método PARE" a partir de outra página.
- "Entrar" leva ao ecrã de autenticação; "Agendar demonstração" leva ao formulário de demo.
- Consola limpa e menu mobile funcional.

## Riscos e pontos por validar

- Falta número de telefone/WhatsApp oficial — fica omitido até ser indicado.
- Consistência de mensagem entre a landing e a página WhatsApp Sales (números e promessas) pode exigir uma revisão de copy numa fase seguinte.
