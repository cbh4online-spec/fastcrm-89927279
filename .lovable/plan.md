
# Adicionar ClubLayout como Wrapper das Rotas FastClub

## Objetivo

Envolver todas as rotas `/club/fastclub/*` no componente `ClubLayout` para que cada pagina tenha automaticamente a sidebar de navegacao, o topbar mobile e o gate de autenticacao.

## Alteracao

Editar `src/App.tsx` para agrupar as ~30 rotas `/club/fastclub/*` dentro de uma rota pai com `ClubLayout` como elemento wrapper, usando a pattern `<Route element={<ClubLayout><Outlet /></ClubLayout>}>`.

### Estrutura resultante

```text
<Route element={<ClubLayout><Outlet /></ClubLayout>}>
  <Route path="/club/fastclub" element={<FastClubPage />} />
  <Route path="/club/fastclub/start-here" element={<StartHerePage />} />
  <Route path="/club/fastclub/metodo-pare" element={<MetodoParePage />} />
  ... (todas as rotas existentes)
</Route>
```

## Detalhe Tecnico

| Ficheiro | Alteracao |
|---|---|
| `src/App.tsx` | Importar `Outlet` de react-router-dom e `ClubLayout`. Envolver as rotas `/club/fastclub/*` (linhas 425-454) numa rota pai com `ClubLayout` como layout element. |

Apenas 1 ficheiro editado. Sem migracoes SQL. Sem novos componentes.
