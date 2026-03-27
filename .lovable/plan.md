

# CRM como módulo base em todos os perfis de sidebar

## Problema
A secção CRM (Leads, Contactos, Empresas, Pipeline, Ciclo de Vida) só existe no perfil **CEO**. Os perfis Vendedor, Gestor e Diretor não têm acesso direto a estes itens na sidebar, apesar de serem funcionalidades core do sistema.

## Plano

### 1. Adicionar secção CRM a todos os perfis

Atualizar `src/config/nav.adaptive.ts` para incluir um bloco CRM em cada perfil, adaptado por relevância:

**Vendedor** — CRM focado na execução diária:
- Leads (com badge), Contactos, Pipeline

**Gestor** — CRM com visão de equipa:
- Leads (com badge), Contactos, Empresas, Pipeline, Ciclo de Vida

**Diretor** — CRM com visão estratégica:
- Leads, Contactos, Empresas, Pipeline, Ciclo de Vida

**CEO** — já tem, mantém como está.

### 2. Reorganizar distribuição no menu

- O bloco CRM ficará posicionado logo após a secção "Principal" (Dashboard) em todos os perfis, por ser funcionalidade core.
- Marcar como `collapsible: true` para não ocupar espaço excessivo.
- Remover duplicações — por exemplo, no perfil Vendedor a secção "Leads" atual será absorvida pela secção CRM unificada.

### Ficheiros alterados
- `src/config/nav.adaptive.ts` — adicionar secção CRM a `vendedorSections`, `gestorSections` e `diretorSections`; reordenar secções.

