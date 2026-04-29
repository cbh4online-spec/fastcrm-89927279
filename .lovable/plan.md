# Onboarding Guiado por Módulo

Cada módulo do marketplace passa a ter uma **apresentação de boas-vindas** (formato slides) que funciona como guia de utilização. O acesso ao módulo só é libertado depois do utilizador completar a apresentação. Quem instalou o módulo antes da feature mantém o acesso (grandfathering opcional).

## Objetivo

- Reduzir fricção: o utilizador percebe o módulo antes de o usar.
- Garantir adoção: ninguém entra "às cegas" num módulo.
- Reaproveitável: o guia pode ser revisitado a qualquer momento ("Ajuda → Ver tour").

## Arquitetura

```text
Instalar módulo  ───►  Apresentação obrigatória  ───►  Acesso libertado
   (marketplace)         (slides + ações)              (ModuleGuard OK)
                              │
                              └─► Registo em module_onboarding_completions
```

## Componentes a criar

**1. Base de dados (migração)**
- `module_onboarding_presentations` — slides por módulo (slug do módulo, ordem, título, conteúdo MD/HTML, imagem, CTA opcional, duração mínima).
- `module_onboarding_completions` — registo por (workspace_id, user_id, module_slug, completed_at, slides_viewed, skipped). RLS: utilizador só lê/escreve os seus próprios.
- Seed inicial com 3–5 slides para os módulos críticos (CRM, Produtos, Vendas, Marketing, Inbox).

**2. Componente `ModulePresentationViewer`**
- Reutiliza o padrão "slides app" (1920x1080 escalável) já documentado no projeto.
- Navegação: setas, dots, barra de progresso, botão "Concluir" só ativo no último slide.
- Tempo mínimo por slide (anti-skip rápido); botão "Saltar" disponível só para super_admin.
- Ao concluir → INSERT em `module_onboarding_completions` → invalida cache → liberta módulo.

**3. Atualização do `ModuleGuard`**
- Após verificar instalação, verificar se há `module_onboarding_completions` para o utilizador atual.
- Se não houver → mostrar `ModulePresentationViewer` em vez do conteúdo do módulo.
- Se houver → render normal dos children.
- Bypass para super_admin (config) e para módulos sem apresentação definida.

**4. Hook `useModuleOnboarding(moduleSlug)`**
- Devolve `{ slides, isCompleted, completeMutation, skipMutation }`.
- Cache via React Query, invalida `workspace-modules` quando completa.

**5. Editor de apresentações (Super Admin)**
- Página em `/dashboard/super-admin/module-onboarding` para criar/editar slides por módulo.
- Lista de módulos + drawer com editor de slides (drag-and-drop para reordenar, preview ao vivo).
- Permite duplicar slides entre módulos.

**6. Re-acesso ao guia**
- Botão "Ver guia do módulo" no header de cada módulo (chama o viewer em modo "review", sem bloquear).

## Fluxo do utilizador

1. Utilizador instala módulo X no marketplace.
2. Ao navegar para `/dashboard/X` → `ModuleGuard` deteta que falta onboarding.
3. Apresentação fullscreen abre automaticamente (5–8 slides com texto, imagens, mini-vídeos GIF opcionais).
4. No último slide: CTA "Começar a usar [Módulo]" → grava conclusão → entra no módulo.
5. A qualquer momento: botão "Ver tour" no header → reabre o viewer em modo review.

## Detalhes técnicos

- **RLS**: `module_onboarding_completions` com policies `user_id = auth.uid()` para SELECT/INSERT; super_admin bypass para gestão.
- **Migração de dados existentes**: opção 1 — marcar todos os módulos já instalados como "completados" (grandfathering, sem disrupção). Opção 2 — forçar todos a ver. **Recomendação: grandfathering** para evitar fricção em utilizadores ativos.
- **Slides storage**: conteúdo em JSON estruturado (`{ heading, body, image_url, bullets[], cta }`) — não HTML livre, para segurança e edição fácil.
- **Imagens**: bucket Supabase Storage `module-onboarding-assets` (público leitura, super_admin escrita).
- **i18n**: campo `lang` por slide (PT/EN/ES/FR) — fallback para PT.
- **Analytics**: registar tempo por slide e taxa de conclusão em `module_action_logs` (já existe).

## Fora do âmbito (fase 1)

- Vídeo embebido (usar GIF/imagem por agora).
- Quiz/validação de compreensão.
- Tour interativo *in-product* (Shepherd.js) — pode vir em fase 2.
- Geração automática de slides por IA — pode vir em fase 2 reutilizando `builder-ai`.

## Pergunta antes de implementar

**Conteúdo inicial dos slides**: começo com slides genéricos (3 por módulo crítico: "O que é", "O que podes fazer", "Como começar") que tu depois editas no painel super_admin? Ou queres que eu gere conteúdo específico para uma lista de módulos que indiques?
