
Objetivo: corrigir de forma definitiva o problema “os testemunhos não aparecem no funil/template”, cobrindo editor, preview e página pública.

1) Diagnóstico confirmado
- A tabela já tem dados (`vertical_templates.testimonials`) e o template `empresas` está publicado com 1 testemunho.
- O problema é de renderização/mapeamento no frontend, não de gravação.
- Causas principais:
  - `VerticalLandingPage.tsx` prioriza `staticConfig` e, para slugs estáticos (ex: `empresas`), ignora o template publicado da base de dados.
  - `rowToConfig` não mapeia `testimonials` e `video_section`.
  - `VerticalTemplateBuilder.tsx` (preview interno) também não inclui `testimonials`/`video_section` em `previewConfig`.

2) Implementação proposta (sem migração DB)
- Ficheiro: `src/pages/VerticalLandingPage.tsx`
  - Atualizar `rowToConfig` para incluir:
    - `testimonials`
    - `video_section`
  - Alterar estratégia de carregamento:
    - Sempre tentar buscar template publicado por `slug`.
    - Se existir na base de dados, usar esse (prioridade).
    - Se não existir, fallback para `staticConfig`.
    - Só mostrar `NotFound` quando não houver nem template publicado nem config estático.
- Ficheiro: `src/components/landing-pages/VerticalTemplateBuilder.tsx`
  - Incluir no `previewConfig`:
    - `testimonials: form.testimonials || []`
    - `video_section: form.video_section`
  - Resultado: o botão “Preview” passa a mostrar testemunhos/vídeo imediatamente.
- Ficheiro: `src/hooks/useVerticalTemplates.ts`
  - Em `useEnsureVerticalTemplate`, ao criar row a partir de `verticalConfigs`, incluir também:
    - `testimonials`
    - `video_section`
  - Evita novos workspaces nascerem sem estas secções nos templates pré-definidos.

3) Validação funcional (E2E)
- No editor de template AIDA:
  - Adicionar 1+ testemunhos, guardar/publicar.
  - Abrir “Preview” interno e validar secção visível.
- Na URL pública do template (`/{slug}`):
  - Confirmar que renderiza o conteúdo vindo da base de dados (não apenas estático).
- Repetir para “Vídeo” para garantir paridade.

4) Resultado esperado
- Testemunhos passam a aparecer:
  - no preview do editor,
  - no link público do template,
  - e em templates auto-provisionados novos.
- Correção focada, sem alterar schema, sem impacto em outras áreas.
