## Diagnóstico (só leitura, sem alterações)

**Conclusão: o site público ainda tem a versão antiga.** Não é uma falha no controlo de permissões.

- O site público serve `index-BgB2sxVa.js`, e o filtro de acessos vem no ficheiro `CRMRoutes-Bb1aQpfR.js`.
- Esse ficheiro tem o filtro antigo, sem a exceção `settings-integrations`/`settings-payment-gateways` (0 ocorrências).
- A permissão `integrations.manage` existe no site, mas nada a usa para abrir estas páginas. Por isso o dono continua a ser enviado para `/dashboard`.
- Versão compilada com a correção: `index-CqeSBJy_.js` e `CRMRoutes-CvbgT3_b.js`, onde a exceção aparece 1 vez.
- Como o código do site é diferente do da correção, o deploy 313ed6b4 / 45e71f73 ainda não serviu esta versão. Ou continua em curso, ou foi feito a partir de um commit anterior à correção.

## Próximo passo (sem alterar código)
1. Confirmar que o deploy concluiu a partir do commit que inclui a correção, e voltar a publicar se for preciso.
2. Validar que o HTML público passa a carregar `index-CqeSBJy_.js`, ou um ficheiro novo cujo `CRMRoutes-*.js` contenha `"settings-integrations","settings-payment-gateways"`.
3. Repetir o teste como dono do Ajax em `/settings/integrations`.
