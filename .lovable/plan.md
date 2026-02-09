

## Fase 4.5 -- Checkout otimizado + Tracking de clientes

### Problema atual
O formulario de checkout pede nome, email e telefone mas sem dar destaque ao telefone. Alem disso, os dados dos clientes da loja ficam isolados nas encomendas e nao sao ligados ao CRM (tabela `contacts`).

### O que vai mudar

**1. Reorganizar o formulario de checkout**
- Reordenar os campos: **Nome completo** > **Telefone** > **Email**
- Tornar o telefone obrigatorio (com validacao)
- Adicionar mascara/placeholder para formato de telefone portugues
- Melhorar o UX com icones nos campos e texto explicativo ("Precisamos do seu contacto para atualizacoes da encomenda")

**2. Captura automatica de contacto no CRM**
- Adicionar coluna `contact_id` (UUID, nullable, FK para contacts) na tabela `store_orders`
- No edge function `create-store-checkout`, apos criar a encomenda:
  - Procurar contacto existente por email no workspace
  - Se existir: ligar a encomenda ao contacto e atualizar telefone/nome se estiverem vazios
  - Se nao existir: criar automaticamente um novo contacto com source = "store" e tags = ["loja-online"]
- Guardar o `contact_id` na encomenda

**3. Painel de cliente na gestao de encomendas**
- Na pagina de encomendas do admin, mostrar link direto para o contacto no CRM
- Mostrar historico de compras do cliente (quantas encomendas, valor total gasto)

---

### Detalhes tecnicos

**Migracao SQL:**
- `ALTER TABLE store_orders ADD COLUMN contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL`

**Ficheiros a modificar:**
- `src/pages/store/StoreCheckoutPage.tsx` -- reordenar campos, telefone obrigatorio, melhor UX
- `supabase/functions/create-store-checkout/index.ts` -- logica de upsert de contacto no CRM
- `src/pages/StoreOrdersPage.tsx` -- mostrar link para contacto e historico

**Ficheiros novos:**
- Nenhum

**Fluxo do checkout atualizado:**
1. Cliente preenche Nome + Telefone + Email
2. Frontend valida todos os campos obrigatorios
3. Edge function recebe dados, valida produtos, cria sessao Stripe
4. Edge function procura/cria contacto no CRM com source "store"
5. Encomenda e criada com `contact_id` ligado
6. Cliente e redirecionado para Stripe Checkout

