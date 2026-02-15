
# Ativar Todos os Modulos no Workspace Metodopare

## Estado Atual

O workspace **metodopare** ja tem o plano **Agency** (o mais completo em termos de limites). No entanto, tem apenas **10 de 23 modulos** do marketplace instalados.

### Modulos ja instalados (10)
- AI Sales Coach, Email Marketing Pro, FastClub, Google Local Services, Instagram Looter, Lead Enricher Pro, Loja Online, Marketplace C2C, Prospeccao Profissional, Student Journey

### Modulos em falta (13)
- AI Assistants, AI Copilot, AI Document OCR, AI Profiles, AI Suggestions, Conversational Engine, IMO AI, Intermediacao de Credito, Knowledge Base AI, Portal B2B, SEO & Growth, WhatsApp Business API, Zapier

## Correcao

Inserir os 13 modulos em falta na tabela `workspace_modules` para o workspace metodopare (`d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f`).

## Plano Tecnico

Uma unica operacao de INSERT na tabela `workspace_modules` com os 13 registos em falta. Cada registo liga o `workspace_id` ao `module_id` correspondente. Nao e necessaria nenhuma migracao de schema nem alteracao de codigo -- o sistema de navegacao e guards ja leem dinamicamente os modulos instalados.

### Dados a inserir

| Modulo | module_id |
|---|---|
| AI Assistants | ff3f911a-cb2c-4539-9bab-e5852141236c |
| AI Copilot | 268d72de-13a0-4834-bde8-5f41e2bcf8b8 |
| AI Document OCR | 37cd744a-55d7-444d-8e81-50148b0407f5 |
| AI Profiles | 3bc695c9-85d1-4377-97f4-a965a0dd49c5 |
| AI Suggestions | 1bbec96e-b7e0-45d1-8b96-64350d6322d2 |
| Conversational Engine | 8d6bb8e2-2032-4a5d-a11e-55876920f88a |
| IMO AI | 4c80fc5a-24f8-488d-baef-bb35ac5bcddd |
| Intermediacao de Credito | 30b23bc0-0850-467c-9ae8-73e93811539b |
| Knowledge Base AI | a1bd01d9-48f8-44e4-aae9-b9bbdaddf616 |
| Portal B2B | 8cdeece9-57c8-41ab-823a-468c89cd5e17 |
| SEO & Growth | 0a540e27-7b5c-4414-83e9-f7e47f46ea65 |
| WhatsApp Business API | 41514c53-6bb4-4204-8efa-9fadaea67309 |
| Zapier | 05cbfdd1-b01f-4096-9ec8-e1dc083f1f88 |

### Resultado esperado

Apos a insercao, o workspace metodopare tera todos os 23 modulos ativos. O menu lateral, guards de acesso e funcionalidades condicionais refletirao automaticamente a versao completa sem qualquer alteracao de codigo.
