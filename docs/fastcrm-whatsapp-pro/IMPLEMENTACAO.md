# FastCRM WhatsApp Pro — Implementação

## Estado
| Iteração | Versão | Âmbito | Estado |
|---|---|---|---|
| 1 | 0.1.1 | Esqueleto MV3, side panel, atalhos | Gravado (commit cb58ef57d) |
| 2A | 0.2.0 | Só frontend: secções, validação E.164, allowlist, testes | Gravado; **não testado em browser** |
| 2B | 0.3.0 | Pesquisa nativa com sessão web existente, sem autenticação na extensão | Implementado; testes dedicados passaram; E2E autenticado pendente |
| Piloto | 0.3.1 | Atalho no módulo, ZIP reproduzível, guia Chrome/Edge e QA Chromium nativo | Pacote verificado; fluxo completo de clipboard no painel e Edge manual pendentes |
| Futura | — | OAuth/PKCE e resultados dentro da extensão | Fora do âmbito; requer aprovação específica |

## Rotas confirmadas no código da app (2A)
- `/auth` — `src/routes/crm/DashboardCoreRoutes.tsx`
- `/dashboard`, `/dashboard/tasks` — `DashboardCoreRoutes.tsx`
- `/dashboard/leads`, `/dashboard/contacts` — `src/routes/sales/SalesCoreRoutes.tsx`
- `/dashboard/inbox` — `src/routes/sales/CommunicationRoutes.tsx`
- `/dashboard/opportunities` — `src/routes/sales/PipelineRoutes.tsx` (`/dashboard/pipeline` redireciona para aqui)
- `src/pages/Contacts.tsx` não usa `useSearchParams` → a extensão abre a listagem sem parâmetros.

## Ficheiros (2A)
`manifest.json`, `background.js` (módulo), `sidepanel.html/js/css`, `lib/phone.js`, `lib/urls.js`, `tests/phone.test.js`, `tests/urls.test.js`, `package.json` (só testes), `README.md`.

## Riscos e limites
- Sem autenticação: a extensão não sabe quem é o utilizador nem se um contacto existe.
- A validação de números é de formato; não confirma que o número é real.
- O carregamento em Chrome/Edge não foi verificado nesta entrega.

## Iteração 2B — 25/10/2026

### Diagnóstico e decisões
- Rotas confirmadas em `SalesCoreRoutes.tsx`: `/dashboard/contacts/:id`, `/dashboard/leads/:id`. Nova entrada em `CommunicationRoutes.tsx`: `/dashboard/whatsapp-pro/lookup`.
- O número nunca passa pela extensão para o website: apenas clipboard explícito, abertura de URL fixo, colagem e pesquisa manual.
- Página reaproveita sessão/contextos/layout/UI; `crm.read`, loading, workspace ausente, instância em erro/inativa ou de outro workspace impedem consultas.
- Query somente leitura, contactos e leads concorrentes, campos mínimos, igualdade por variantes no servidor, workspace obrigatório, 20 resultados/fonte. Contactos não eliminados/não arquivados; leads não arquivadas. Erro por fonte não é zero resultados.
- Remount por utilizador/workspace e cancelamento impedem reaparecimento de resultados atrasados; mudar número/cliente limpa estado. Timeout 15 segundos, sem logs de telefone.
- Conteúdo sensível marcado `ph-no-capture`, `ph-mask`, `sentry-block`; nenhuma persistência do telefone em URL/storage/analytics foi acrescentada.

### Estrutura técnica e ficheiros
- `src/pages/whatsapp-pro/WhatsAppProContactLookup.tsx`: página e estados.
- `src/pages/whatsapp-pro/lookup.ts`: normalização, variantes e consultas testáveis.
- `src/pages/whatsapp-pro/{lookup.test.ts,WhatsAppProContactLookup.test.tsx}`: 10 testes.
- `src/routes/sales/CommunicationRoutes.tsx`: import lazy + uma rota.
- Extensão: `manifest.json`, `package.json`, `background.js`, `lib/urls.js`, `sidepanel.html`, `sidepanel.js`, `sidepanel.css`, `tests/lookup.test.js`, `README.md`.
- Esta documentação. Nenhum ficheiro de operações/schema/migração/configuração global alterado.

### Critérios de aceitação e validação
Comandos executados:
```bash
node --test extensions/fastcrm-whatsapp-pro/tests/*.test.js
for f in extensions/fastcrm-whatsapp-pro/background.js extensions/fastcrm-whatsapp-pro/sidepanel.js extensions/fastcrm-whatsapp-pro/lib/*.js; do node --check "$f"; done
bunx vitest run src/pages/whatsapp-pro/lookup.test.ts src/pages/whatsapp-pro/WhatsAppProContactLookup.test.tsx
bunx eslint src/pages/whatsapp-pro/*.ts src/pages/whatsapp-pro/*.tsx src/routes/sales/CommunicationRoutes.tsx
```
Resultados: 8 testes Node + 10 Vitest passaram, sintaxe e lint passaram. Build automático do preview registou `build OK`. Não foi executado build/typecheck manual global.

Navegador: destino `/auth` com redirect relativo fixo verificado; painel com APIs Chrome simuladas copiou e abriu o destino correto, recusou cópia sem abrir e não apresentou overflow a 360px. Screenshots temporários em `/tmp/browser/whatsapp-pro-lookup/`. Não é um teste de instalação MV3.

### Riscos e pontos por validar
- Sem sessão disponibilizada para o teste, não se confirmou E2E com resultados reais nem isolamento entre contas na BD. Não se criaram contas/sessões/dados.
- Migrações existentes descrevem RLS de contactos/leads por pertença ao workspace; estado efetivo de produção não foi consultado (proibição de ferramentas de BD respeitada).
- Contexto de instância existente pode recorrer ao cliente principal após timeout/ausência de configuração e clientes externos têm sessão própria. Não foi alterado; a página bloqueia erros/estado não ativo/mismatch e acrescenta sempre filtro workspace. Falhas de autenticação/leitura não são contornadas.
- Campos armazenados com separadores não correspondem necessariamente aos formatos completos/nacional PT. Não se varrem registos nem se muda a BD para resolver isto.
- Instalação manual Chrome/Edge, visual da página autenticada desktop/mobile e pesquisa real continuam pendentes; resultados no painel exigem OAuth futuro.
- Sem deploy/publish, novas APIs, SQL, migrações ou alterações a dados. Os três novos avisos automáticos de segurança ficam ativos; qualquer correção de acesso requer decisão própria, não foi executado scanner/auto-fix.

### Persistência e hash
Base observada antes de editar: `e6e008727e1f235ef413941605f5da62a3c8f9e3`, árvore limpa. A gravação é gerida pelo Lovable; o agente não executa comandos git de commit. Ficheiros gravados no projeto e testes leem-nos do disco. O hash final verificável é comunicado no relatório após inspeção, sem inventar commit.

## Pendência separada (NÃO alterada nesta iteração)
A migração 0079 (políticas RLS de `event_registry`, `fastmatch_reputation_reviews`, `c2c_public_offers`) foi aplicada sem autorização numa execução anterior. A auditoria identificou:
- **Alto:** o recálculo da reputação FastMatch no cliente lê só as avaliações visíveis e pode gravar uma média errada.
- **Médio:** o mapa de eventos fica vazio para admins de workspace que não são super admin.
- **Médio (anterior à 0079):** oferta pública anónima pode falhar no `.select()` após o insert.
Nenhuma destas foi tocada; cada correção requer autorização própria.

## Entrega v0.3.1 — 25/10/2026

### Diagnóstico, decisões e estrutura
Base verificada: `4451e0060e0927b7ca54dce7a56b4b91f961de4e`, árvore inicialmente limpa. Rota lookup já existente e confirmada em `CommunicationRoutes.tsx`; extensão não recriada. Acrescentada uma entrada «Pesquisar contacto» no grupo Conversas de `WhatsAppPro.tsx`, sem mudanças aos hooks/provider. Bloco compacto com download fetch+blob, validação de assinatura ZIP, loading/erro e instruções de instalação. Botões de atalhos reutilizam Button. Removida anotação `any` preexistente na lista de eventos para passar lint, sem alterar comportamento.

Empacotamento isolado: `scripts/package-extension.mjs`, Node nativo e binários locais zip/unzip; allowlist explícita, paths seguros, recusa symlinks, datas fixas, entradas na raiz e hash. Novos testes de pacote e de acesso frontend na pasta da extensão; testes v0.3.0 intactos. Guia `INSTALACAO-PILOTO.md` com diagnóstico, atualização, reversão e checklist humano.

### Resultado do pacote
`public/downloads/fastcrm-whatsapp-pro-v0.3.1.zip` — **9 543 bytes**, 11 ficheiros, integridade unzip confirmada; SHA-256 `5e984a53840a83a0967035787600a880cf08c8f65f4a4e513ac75aac1854d616`. Duas gerações independentes nos testes produziram o mesmo hash. DIST inclui apenas manifest, background, sidepanel HTML/JS/CSS, lib phone/urls, locale e 3 ícones.

### QA e critérios de aceitação
- Node completo: **9 aprovados, 1 falhado**, nenhum ignorado. Falha do teste legado `lookup.test.js` na asserção literal versão `0.3.0`, incompatível com o incremento pedido; não se editou esse teste. Asserções de MV3/paths/permissões são também verificadas pelo novo teste de pacote v0.3.1.
- Vitest pesquisa v0.3.0: **10/10 aprovados**; dois avisos informativos React Router v7, sem falhas.
- Vitest adicional do módulo: **2/2 aprovados**, navegação para lookup e erro/loading do download. Executado com configuração temporária para incluir o teste isolado sob a pasta da extensão, sem alterar a configuração global.
- Download pelo botão real verificado via Playwright numa montagem isolada do módulo (hooks/layout substituídos apenas no teste para impedir qualquer leitura/escrita de dados): ficheiro guardado com 9 543 bytes e hash correto, sem erros JS; vistas desktop/mobile inspecionadas. Não é E2E autenticado do módulo.
- Sintaxe JS/MJS e lint focado passaram; build automático registou `build OK`. Nenhum build/typecheck global manual.
- Chromium nativo via persistent context headless, DIST, perfil temporário e sem mocks: worker real, manifest e APIs reais; painel aberto com sidePanel.open e acedido via CDP. Normalização e `OPEN_TAB` autorizado `ok: true`; URL externo recusado. A página da extensão num separador normal é recusada por sender.tab como previsto.
- Clipboard no painel headless foi recusado: feedback de erro e nenhum separador aberto. **Não se declara confirmado o fluxo humano completo copiar → abrir**, nem instalação Edge/gesto físico no ícone. Capturas temporárias do documento desktop/mobile e painel nativo; sem overflow a 360px. Sem login, pesquisa real ou acesso a dados; navegações de produção abortadas.
- A interface nova não foi publicada: a extensão abre a origem de produção fixa, pelo que o acesso novo no módulo depende de publicação futura expressamente autorizada.

### Escopo, persistência e bloqueios
Alterações limitadas à extensão, documentação, `src/pages/WhatsAppPro.tsx` e ZIP autorizado. Não se editaram AGENTS.md/roadmap.md por estarem fora da allowlist; a regra técnica do empacotamento fica documentada no README da extensão. Nenhuma alteração a 0079, backend, dados, sessão, .env, providers, envios ou produção. OAuth/PKCE e resultados no painel continuam fora do âmbito. Gravação/commit geridos pelo Lovable, sem comandos git stateful; comunicar apenas hash efetivamente observado, nunca inventar hash final.
