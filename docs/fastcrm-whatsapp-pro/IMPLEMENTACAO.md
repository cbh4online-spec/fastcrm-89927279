# FastCRM WhatsApp Pro — Implementação

## Estado
| Iteração | Versão | Âmbito | Estado |
|---|---|---|---|
| 1 | 0.1.1 | Esqueleto MV3, side panel, atalhos | Gravado (commit cb58ef57d) |
| 2A | 0.2.0 | Só frontend: secções, validação E.164, allowlist, testes | Gravado; **não testado em browser** |
| 2B | 0.3.0 | Pesquisa nativa com sessão web existente, sem autenticação na extensão | Implementado; testes dedicados passaram; E2E autenticado pendente |
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
