# Preview não arranca — diagnóstico e plano

## Diagnóstico

O servidor de desenvolvimento está a funcionar: responde 200 em `http://localhost:8080/` e o Vite arrancou sem erros de compilação.

O erro visível no seu ecrã ("Live preview couldn't start" / "Failed to fetch dynamically imported module ... lovable-preview-execute-client") é um chunk em cache desatualizado no iframe do editor, não um erro da aplicação. O projeto tem, propositadamente, um bloqueio de auto-reload em `src/main.tsx` para evitar ciclos de recarregamento — por isso o iframe fica parado à espera de ação manual.

## Plano

1. Primeiro passo, sem alterar código: clicar em "Tentar novamente" no aviso do preview (ou recarregar o editor). Na maioria dos casos resolve, porque o servidor está saudável.
2. Se voltar a acontecer: ajustar o tratamento de chunks obsoletos em `src/main.tsx` para fazer um único recarregamento automático controlado (uma só vez por sessão, com marca em `sessionStorage`), em vez de apenas registar um aviso na consola. Isto elimina o ecrã bloqueado sem risco de ciclo infinito.
3. Reiniciar o servidor de desenvolvimento e confirmar: preview carrega, rota `/dashboard/store-settings` renderiza, consola sem erros de módulo.

## Notas técnicas

- Ficheiro afetado: `src/main.tsx` (função `handleStaleChunk`).
- Sem alterações de dados, RLS, rotas ou lógica de negócio.
