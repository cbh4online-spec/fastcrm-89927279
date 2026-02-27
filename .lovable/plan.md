

# Disponibilizar módulos em falta no sidebar do METODOPARE

## Diagnóstico

Os 26 módulos estao **activos** na base de dados (`workspace_modules.status = 'active'`), mas **12 módulos nao aparecem no sidebar** porque nao estao registados no `EXTENSION_REGISTRY` (`src/config/extensionRegistry.ts`). O sidebar usa este registo para saber que entradas mostrar.

As feature flags existentes (`ui.*` e `ext.*`) ja cobrem as funcionalidades core. O problema real e a falta de entradas no registo de extensoes.

## Módulos em falta no Extension Registry

| Módulo (slug) | Página existente | Rota |
|---|---|---|
| `ai-assistants` | Sim | `/dashboard/ai-assistants` |
| `ai-copilot` | Integrado no Ask | `/dashboard/ask` |
| `conversational-engine` | Sim | `/dashboard/conversational-engine` |
| `knowledge-base` | Redirect para ai-assistants | `/dashboard/ai-assistants` |
| `ai-suggestions` | Sim | `/dashboard/ai-suggestions` |
| `ai-sales-coach` | Nao tem pagina dedicada | -- |
| `ai-document-ocr` | Nao tem pagina dedicada | -- |
| `ai-profiles` | Redirect para ai-assistants | `/dashboard/ai-assistants` |
| `email-campaigns` | Nao tem pagina dedicada | -- |
| `whatsapp-business` | Integrado no Inbox | `/dashboard/inbox` |
| `imo-ai` | Nao tem pagina dedicada | -- |
| `zapier-integration` | Nao tem pagina dedicada | -- |

## Solucao

### Passo 1: Adicionar entradas ao Extension Registry

Actualizar `src/config/extensionRegistry.ts` para incluir os 12 módulos em falta, agrupados nas categorias correctas:

- **IA**: ai-assistants, ai-copilot, conversational-engine, knowledge-base, ai-suggestions, ai-sales-coach, ai-document-ocr, ai-profiles, imo-ai
- **Marketing**: email-campaigns
- **Integracoes**: whatsapp-business, zapier-integration

Cada entrada tera:
- `moduleSlug` correspondente ao slug no marketplace
- `objectTabs` com rota para a pagina existente (ou pagina placeholder para os que ainda nao tem)
- `category` adequada (sera necessario adicionar "IA" e "Integracoes" ao tipo `ExtensionCategory`)

### Passo 2: Adicionar categorias em falta

Adicionar `"IA"` e `"Integracoes"` ao tipo `ExtensionCategory` e ao `categoryOrder` na funcao `getExtensionObjectTabsGrouped`.

### Passo 3: Criar paginas placeholder para modulos sem pagina

Criar paginas simples de placeholder para: `ai-sales-coach`, `ai-document-ocr`, `email-campaigns`, `imo-ai`, `zapier-integration`. Cada uma com layout basico, titulo e descricao "Em breve" + link ao Marketplace.

### Passo 4: Adicionar rotas no App.tsx

Registar as novas rotas para as paginas placeholder.

## Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/config/extensionRegistry.ts` | Adicionar 12 modulos + novas categorias |
| `src/pages/EmailCampaignsPage.tsx` | Nova pagina placeholder |
| `src/pages/WhatsAppSettingsPage.tsx` | Nova pagina de settings WhatsApp |
| `src/pages/AISalesCoachPage.tsx` | Nova pagina placeholder |
| `src/pages/AIDocumentOCRPage.tsx` | Nova pagina placeholder |
| `src/pages/IMOAIPage.tsx` | Nova pagina placeholder |
| `src/pages/ZapierPage.tsx` | Nova pagina placeholder |
| `src/App.tsx` | Adicionar rotas para novas paginas |

