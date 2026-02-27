

# Corrigir Filtragem V1: Mover Itens Base para Grupos Core

## Problema

A filtragem por `moduleSlug` já está implementada no código, mas não produz efeito visível porque muitos itens em grupos como **Vendas**, **Marketing**, **Ferramentas** e **Relatórios** não têm `moduleSlug`, mantendo esses grupos sempre visíveis.

Exemplo: O grupo "Vendas" tem Pipeline, Agendamento e Produtos sem `moduleSlug` — logo o grupo nunca desaparece mesmo sem módulos.

## Solução

Reestruturar `nav.v1.ts` para que itens base saiam dos seus grupos actuais e passem para grupos core (Principal ou CRM). Assim, os grupos que ficam só com itens de módulo desaparecem quando o módulo não está instalado.

### Movimentação de itens em `src/config/nav.v1.ts`

| Item actual | Grupo actual | Novo grupo | Razão |
|---|---|---|---|
| Pipeline | Vendas | CRM | Sempre visível |
| Agendamento | Vendas | CRM | Sempre visível |
| Produtos | Vendas | CRM | Sempre visível |
| Marketing (base) | Marketing | Remover | Sem destino — era só label |
| Funis | Marketing | Ferramentas | Sempre visível |
| Visão Geral, KPIs, Metas, Previsões, Consumo | Relatórios | Mover para grupo "Relatórios" com itens todos sem moduleSlug — manter grupo visível (é core) |
| Automações, Assistentes IA, AI Employees, Form Studio, Importações, Integrações, Marketplace | Ferramentas | Mover para grupo "Ferramentas" que fica sempre visível (core) |

**Resultado**: Após estas mudanças:
- **Vendas** fica só com Propostas (`proposals`) e Faturas (`invoices`) → desaparece sem esses módulos
- **Marketing** fica só com Email Marketing, Google Local, Bio OS → desaparece sem esses módulos  
- **Estratégia** fica só com Brief (`strategy-brief`) → desaparece sem módulo
- **Relatórios** e **Ferramentas** ficam como grupos core (sempre visíveis, têm itens sem moduleSlug)

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/config/nav.v1.ts` | Mover Pipeline/Agendamento/Produtos para CRM; remover item "Marketing" base; mover Funis para Ferramentas |

