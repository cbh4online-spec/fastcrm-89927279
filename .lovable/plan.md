

## Diagnóstico

### Estado Atual
O marketplace C2C tem dois perfis distintos mas com maturidades muito diferentes:

**Vendedores (bem implementado):**
- Tabela `c2c_sellers` com registo, aprovação, dashboard, analytics, stories, boost, comissões, tiers, verificação
- Área dedicada (`C2CSellerArea`), perfil público, registo via `/sell`

**Compradores/Clientes (praticamente inexistente):**
- Não existe tabela dedicada para compradores — são apenas `auth.users` anónimos
- A página `C2CClientsManagement` agrega compradores ad-hoc a partir de `c2c_transactions` (por email/phone), sem perfil real
- Sem dashboard de comprador, sem histórico de compras, sem favoritos persistentes, sem seguir vendedores com conta

### Problema
Os compradores não têm identidade no marketplace. Isto limita: histórico de compras, reviews, seguir vendedores, favoritos, disputas, programa de fidelidade e qualquer personalização.

---

## Proposta: Contas de Comprador no Marketplace C2C

### 1. Tabela `c2c_buyers` (nova)
Perfil de comprador ligado ao `auth.users`, espelhando o padrão de `c2c_sellers`:

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | — |
| user_id | uuid (unique por workspace) | Ligação ao auth |
| workspace_id | uuid | Isolamento |
| display_name | text | Nome público |
| avatar_url | text | Foto |
| phone | text | Contacto |
| shipping_address | jsonb | Morada de envio padrão |
| total_purchases | int (default 0) | Contador |
| total_spent | numeric (default 0) | Valor total |
| loyalty_points | int (default 0) | Pontos fidelidade |
| is_verified | bool (default false) | Verificação |
| status | enum (active/suspended) | Estado |
| created_at / updated_at | timestamptz | — |

RLS: leitura para membros do workspace, escrita apenas pelo próprio user.

### 2. Área do Comprador (dashboard)
Nova página `/dashboard/c2c/buyer-area` com:
- **KPIs**: Total compras, valor gasto, pontos fidelidade, avaliações feitas
- **Histórico de encomendas**: Lista de transações com estado e tracking
- **Vendedores seguidos**: Lista com notificações de novos produtos
- **Favoritos**: Já existe `C2CFavorites`, ligar à conta
- **Disputas ativas**: Link para disputas abertas
- **Morada guardada**: Edição da shipping address

### 3. Auto-criação do perfil de comprador
- Ao fazer a primeira compra (checkout), criar automaticamente o registo em `c2c_buyers` via trigger ou no `create-c2c-checkout`
- Se o user já for vendedor, pode ser comprador simultaneamente (perfis separados)

### 4. Integração na Gestão de Clientes
- `C2CClientsManagement` passa a ler de `c2c_buyers` em vez de agregar transações
- Permite ao admin ver perfil completo, histórico, status e suspender compradores

### 5. Ficheiros a criar/editar

| Ação | Ficheiro |
|---|---|
| **Migração** | Criar tabela `c2c_buyers` + RLS + trigger de updated_at |
| **Criar** | `src/hooks/useC2CBuyers.ts` — hooks CRUD |
| **Criar** | `src/pages/c2c/C2CBuyerArea.tsx` — dashboard do comprador |
| **Editar** | `src/routes/C2CRoutes.tsx` — rota `/dashboard/c2c/buyer-area` |
| **Editar** | `src/pages/c2c/C2CClientsManagement.tsx` — usar `c2c_buyers` |
| **Editar** | Edge Function `create-c2c-checkout` — auto-criar buyer profile |

### Riscos
- Migração de dados: compradores existentes (em transações) sem perfil — resolver com migration script
- Dualidade vendedor/comprador: garantir que o mesmo user pode ter ambos os perfis

