# FastCRM WhatsApp Pro — Implementação

## Estado
| Iteração | Versão | Âmbito | Estado |
|---|---|---|---|
| 1 | 0.1.1 | Esqueleto MV3, side panel, atalhos | Gravado (commit cb58ef57d) |
| 2A | 0.2.0 | Só frontend: secções, validação E.164, allowlist, testes | Gravado; **não testado em browser** |
| 2B | — | Autenticação segura (code + PKCE via `chrome.identity.launchWebAuthFlow`) e consulta só de leitura | Por aprovar; requer backend |

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

## Pendência separada (NÃO alterada nesta iteração)
A migração 0079 (políticas RLS de `event_registry`, `fastmatch_reputation_reviews`, `c2c_public_offers`) foi aplicada sem autorização numa execução anterior. A auditoria identificou:
- **Alto:** o recálculo da reputação FastMatch no cliente lê só as avaliações visíveis e pode gravar uma média errada.
- **Médio:** o mapa de eventos fica vazio para admins de workspace que não são super admin.
- **Médio (anterior à 0079):** oferta pública anónima pode falhar no `.select()` após o insert.
Nenhuma destas foi tocada; cada correção requer autorização própria.
