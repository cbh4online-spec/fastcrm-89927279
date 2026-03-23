

## Problema

Quando um novo utilizador se regista no FastCRM (ex: Daniel Freitas, `viagenscomproposito.daniel@gmail.com`), o sistema:
1. ✅ Cria conta auth + profile
2. ✅ Cria workspace próprio ("Viagens com Propósito")
3. ✅ Notifica admin (admin_notifications)
4. ❌ **NÃO cria um lead/contacto no workspace METODOPARE** para acompanhamento comercial

Resultado: a equipa METODOPARE não consegue acompanhar novos registos como leads no CRM.

---

## Solução: Auto-criar lead no METODOPARE a cada novo registo

### 1. Trigger SQL — `create_lead_on_new_workspace`

Adicionar um trigger na tabela `workspaces` (AFTER INSERT) que:
- Busca o perfil do owner (email, nome) via `workspace_members` + `profiles`
- Insere um lead no workspace METODOPARE (`d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f`) com:
  - `name`: nome completo do utilizador
  - `email`: email do utilizador
  - `source`: `"Registo FastCRM"`
  - `status`: `"new"`
  - `company`: nome do workspace criado
  - `notes`: dados do workspace (plano, slug)
- Verifica duplicados por email antes de inserir

### 2. Backfill — Inserir Daniel como lead agora

Inserção manual do lead para o caso actual:
- workspace_id: `d9e3d0ae-5893-41e9-97f3-7d7ce6a06f0f` (METODOPARE)
- name: "Daniel Freitas"
- email: `viagenscomproposito.daniel@gmail.com`
- source: "Registo FastCRM"
- company: "Viagens com Propósito"

### 3. Backfill histórico (opcional)

Script para criar leads para todos os workspaces existentes que ainda não têm lead correspondente no METODOPARE.

---

### Detalhes técnicos

**Migration SQL:**
- Função `public.create_lead_on_new_workspace()` (SECURITY DEFINER)
- Trigger `trg_lead_on_new_workspace` ON `workspaces` AFTER INSERT
- A função faz JOIN com `workspace_members` (role='owner') + `profiles` para obter dados
- Check de duplicado: `NOT EXISTS (SELECT 1 FROM leads WHERE workspace_id = METODOPARE_ID AND email = profile.email)`

**Inserção imediata** do Daniel via insert tool.

