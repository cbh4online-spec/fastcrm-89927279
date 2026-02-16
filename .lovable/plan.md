
# Mockup de Dashboard Dinamico por Vertical

## Objectivo

Substituir a imagem estatica do dashboard (`vertical-dashboard-mockup.png`) por um componente React que renderiza um mockup visual do CRM personalizado com o nome da vertical, modulos e cores especificas. Assim, "Ginasios" mostra um pipeline com termos de ginasios, "Clinicas" com termos clinicos, etc.

## Abordagem

Criar um componente `DashboardMockup` em React/CSS que simula visualmente um dashboard CRM com dados dinamicos vindos do `VerticalConfig`:

- **Sidebar** com nome da vertical e icones dos modulos
- **Pipeline Kanban** com colunas ("Novo Lead", "Em Contacto", "Proposta", "Fechado") e cards com nomes ficticios relevantes ao sector
- **Mini stats** no topo (total contactos, oportunidades abertas, valor pipeline)
- **Cores** adaptadas a `config.cores.primaria`

Tudo renderizado como HTML/CSS (sem imagem), com o gradiente de fade na base mantido.

## Plano Tecnico

### 1. Criar componente `src/components/vertical-landing/DashboardMockup.tsx`

Componente que recebe `VerticalConfig` e renderiza:

```text
+------------------------------------------+
| FastCRM    | Novo Lead | Contacto | ...  |
|  [Vertical]|  Card 1   |  Card 3  |      |
|  Modulo 1  |  Card 2   |  Card 4  |      |
|  Modulo 2  |           |          |      |
|  ...       |           |          |      |
+------------------------------------------+
```

- Dados ficticios por vertical mapeados internamente (ex: para Ginasios -> "João Silva - Plano Premium", para Clinicas -> "Maria Costa - Consulta Dermatologia")
- Fallback generico para verticais dinamicas sem mapeamento especifico (usa o nome da vertical nos titulos)
- Escala reduzida (`transform: scale(0.7)` ou similar) para parecer um screenshot real
- Fundo escuro consistente com o tema dark da landing page

### 2. Editar `src/components/vertical-landing/VerticalHero.tsx`

- Remover import da imagem estatica `dashboardMockup`
- Substituir o `<img>` pelo novo `<DashboardMockup config={config} />`
- Manter a animacao framer-motion e o gradiente de fade existentes

### Ficheiros

- **Criar**: `src/components/vertical-landing/DashboardMockup.tsx`
- **Editar**: `src/components/vertical-landing/VerticalHero.tsx`

### Notas

- O componente e puramente visual (decorativo), sem interactividade
- Funciona para verticais estaticas e dinamicas (usa `config.nome` e `config.modulos_ativos` directamente)
- Nao requer chamadas a API nem edge functions
