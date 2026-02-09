
# Atualizar Auditoria Funcional com Novos Módulos

O problema e que a lista de modulos (`AUDIT_MODULES`) e as categorias de edge functions (`EDGE_FUNCTION_CATEGORIES`) no ficheiro `src/types/audit.ts` sao **listas estaticas hardcoded** que nao foram atualizadas quando novos modulos e funcionalidades foram adicionados ao sistema.

---

## O que esta em falta

### Modulos Funcionais em falta no `AUDIT_MODULES`:
| Modulo | Descricao |
|--------|-----------|
| Loja Online | StorePage, StoreProductPage, StoreCheckout, StoreCart, StoreCategories |
| Notas de Encomenda | OrderNotesPage, OrderNoteDetail, OrderAuditTrail |
| Formularios Inteligentes | SmartForms, FormBuilder, FormSubmissions |
| Produtividade | ProductivityDashboard, DailyPriorities |
| Pacotes & Bundles | PackagesPage, BundleCheckout |
| Portal do Cliente | ClientPortal, ClientUsers, ClientEntitlements |
| Relatorios & KPIs | ReportsGoals, GoalsVsResults |
| Perfis de Actividade | ActivityProfiles, EntityProfileData |
| Video & Reunioes | VideoMeetings, CreateVideoMeeting |
| Landing Pages | PublicLandingPage, LandingPageCopy |
| Student Journey (Sao Joao) | SJDashboard, SJCourses, SJCohorts, SJProfiles |
| AI Assistentes Avancados | AIAssistants, AIProfiles, VibeProfiles, ConversationalFlows |
| Fichas de Produto Publicas | PublicProductSheet, ProductEmbeddings |

### Edge Functions em falta no `EDGE_FUNCTION_CATEGORIES`:
- `store-ai-advisor`, `store-webhook`, `create-store-checkout` (Loja Online)
- `order-note-notify`, `order-note-submit` (Notas de Encomenda)
- `ai-diagnostic-assistant`, `ai-proposal-assistant` (IA)
- `create-client-auth-user`, `send-client-invitation`, `activate-client-invite` (Portal Cliente)
- `create-video-meeting`, `video-auth-url`, `video-oauth-callback` (Video)
- `admin-module-margin`, `admin-user-management` (Admin)
- `generate-product-embeddings`, `product-embedding`, `product-semantic-search` (Produtos)
- `knowledge-document-trigger` (Knowledge Base)
- `elevenlabs-proposal-token` (Audio)

---

## Alteracoes

### Ficheiro: `src/types/audit.ts`

1. **Adicionar novos modulos** ao array `AUDIT_MODULES` (13 modulos novos)
2. **Atualizar `EDGE_FUNCTION_CATEGORIES`** com as edge functions em falta, adicionando-as as categorias existentes ou criando novas categorias quando necessario (ex: "Loja Online", "Portal do Cliente", "Video & Reunioes", "Notas de Encomenda", "Admin & Gestao")

Nenhuma outra alteracao e necessaria - o componente `FunctionalAuditSection.tsx` ja itera sobre `AUDIT_MODULES` dinamicamente e o hook `useSystemAudit` ja conta as edge functions a partir das categorias.
