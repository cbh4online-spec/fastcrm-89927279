
# Reactivar todos os módulos no workspace METODOPARE

## Situação actual

O workspace **METODOPARE** (`d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f`) tem 26 módulos instalados, mas **16 estão cancelados**:

| Módulo | Status Actual |
|--------|--------------|
| AI Assistants | canceled |
| AI Copilot | canceled |
| AI Document OCR | canceled |
| AI Profiles | canceled |
| AI Sales Coach | canceled |
| AI Suggestions | canceled |
| Bio OS | canceled |
| Conversational Engine | canceled |
| Email Marketing Pro | canceled |
| FastClub (Comunidade) | canceled |
| Google Local Services | canceled |
| IMO AI | canceled |
| Instagram Looter | canceled |
| Knowledge Base AI | canceled |
| WhatsApp Business API | canceled |
| Zapier | canceled |

Os seguintes **10 módulos já estão activos**: Portal B2B, Intermediação de Crédito, Finance Pack, Lead Enricher Pro, Marketplace C2C, Loja Online, Proposals Pack, Prospecção Profissional, SEO & Growth, Student Journey.

## Solução

### Passo 1: Migração SQL -- Reactivar módulos cancelados
Executar um UPDATE na tabela `workspace_modules` para mudar o status de `canceled` para `active` em todos os módulos do workspace METODOPARE:

```sql
UPDATE workspace_modules 
SET status = 'active' 
WHERE workspace_id = 'd9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f' 
  AND status = 'canceled';
```

### Passo 2: Garantir feature flags necessárias
Verificar e inserir feature flags que possam estar em falta para funcionalidades dependentes (ex: `ext.fastclub.enabled`, `ext.email_campaigns.enabled`, etc.), caso os módulos reactivados necessitem de flags adicionais para funcionar no sidebar.

Nenhuma alteração de código frontend é necessária -- o sistema já lê os módulos activos dinamicamente via `useWorkspaceModules` e reflecte no sidebar e nas guards.
