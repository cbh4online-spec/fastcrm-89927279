# FastCRM WhatsApp Pro v0.3.1 — instalação piloto

## Âmbito e diagnóstico
A extensão v0.3.0 e a pesquisa nativa já existiam. Esta entrega acrescenta um único atalho «Pesquisar contacto» em Conversas, instalação piloto e empacotamento isolado. Não altera Z-API, providers, sessões, dados ou políticas. Piloto — **sem acesso autenticado diretamente no painel**.

## Obter o pacote
No módulo **WhatsApp Pro**, use **Descarregar v0.3.1**. O ficheiro existe no projeto em `public/downloads/fastcrm-whatsapp-pro-v0.3.1.zip`, servido em `/downloads/fastcrm-whatsapp-pro-v0.3.1.zip`. Não é instalação automática nem publicação na Chrome Web Store. A nova interface não foi publicada nesta entrega.

## Instalar no Chrome e no Edge (116+)
1. Descompacte o ZIP para uma pasta permanente. O `manifest.json` deve estar diretamente nessa pasta.
2. No Chrome abra `chrome://extensions`; no Edge abra `edge://extensions`.
3. Ative **Modo de programador / Developer mode**.
4. Clique **Carregar sem compactação / Load unpacked** e selecione a pasta descompactada — não selecione o ZIP.
5. Confirme o nome **FastCRM WhatsApp Pro** e a versão **0.3.1**. Fixe o ícone na barra, se desejar.
6. Clique no ícone da extensão para abrir o painel lateral, junto do WhatsApp Web. Não abra `sidepanel.html` num separador normal: por segurança esse remetente é recusado.

## Fluxo manual
1. Abra o WhatsApp Web e confirme manualmente o número da pessoa. A extensão não lê a conversa.
2. No painel, escolha **Contacto**. Introduza, por exemplo, `912345678` (exemplo de formato, não identificação de uma pessoa real).
3. Clique **Validar**: deve aparecer `+351912345678`.
4. Clique **Copiar e pesquisar no FastCRM**. O telefone vai apenas para a área de transferência, nunca para o URL.
5. No website, use a sua sessão habitual, confirme o workspace, cole o telefone e clique **Pesquisar**. Os resultados só aparecem no website; «Abrir ficha» abre contacto ou lead.
6. Também pode entrar no módulo WhatsApp Pro e escolher **Conversas → Pesquisar contacto**.

## Erros e diagnóstico
| Situação | Ação |
|---|---|
| Manifest ausente | Selecionar a pasta que contém `manifest.json`, não a pasta acima nem o ZIP. |
| API sidePanel indisponível | Atualizar Chrome/Edge; verificar políticas empresariais que possam bloquear extensões. |
| «Sem ligação autenticada» | Estado esperado da extensão. A sessão é apenas do website. |
| Cópia recusada | Copiar o número manualmente e usar **Início → Pesquisar no FastCRM**. Nenhuma pesquisa é realizada automaticamente. |
| «Não foi possível abrir a página» | Usar o ícone para abrir o painel lateral verdadeiro; um separador `sidepanel.html` não é autorizado. Verificar erros do service worker em Extensões. |
| Download indisponível | Tentar novamente. Não tratar uma resposta HTML/401 como ZIP. Em Safari na prévia, o download pode ser bloqueado; o piloto destina-se a Chrome/Edge desktop. |
| Login solicitado | Iniciar sessão normalmente no website; nunca colar tokens na extensão. |
| Sem workspace/permissão, erro de leitura | Confirmar o workspace no website; não contornar proteções. |
| Zero resultados | Rever indicativo e formato guardado; números armazenados com separadores podem não corresponder. Não prova inexistência. |

## Atualizar, reverter e desinstalar
- Atualizar: descompactar a nova versão, selecionar a pasta correta e clicar **Recarregar** na página Extensões. Fechar e reabrir o painel.
- Reverter: remover a v0.3.1 e carregar uma cópia confiável anterior; não misturar ficheiros de versões diferentes.
- Desinstalar: **Remover** em `chrome://extensions` ou `edge://extensions`, fechar o painel e apagar a pasta local se desejar. Nenhum dado do CRM é apagado.

## Empacotamento reproduzível (sem dependências Node)
Na raiz do projeto:
```bash
node extensions/fastcrm-whatsapp-pro/scripts/package-extension.mjs
# Só pasta para Load unpacked, se não houver zip:
node extensions/fastcrm-whatsapp-pro/scripts/package-extension.mjs --dist-only
node --test extensions/fastcrm-whatsapp-pro/tests/*.test.js
```
O script gera `extensions/fastcrm-whatsapp-pro/dist/fastcrm-whatsapp-pro/` a partir de uma allowlist de 11 ficheiros. Não copia README, testes, scripts, configuração ou segredos. Valida paths do manifest/HTML, recusa symlinks, normaliza datas e gera SHA-256. Usa apenas os binários locais `zip` e `unzip`; sem instalação global. Se `zip` faltar, a pasta continua utilizável e o download web fica pendente. Falha de integridade termina com erro.

**Pacote verificado:** 9 543 bytes; SHA-256:
```text
5e984a53840a83a0967035787600a880cf08c8f65f4a4e513ac75aac1854d616
```

## QA real e limites
- Instalação nativa **Chromium headless**, perfil temporário, a partir de DIST, sem mocks das APIs Chrome: service worker real, manifest 0.3.1, documento de extensão e painel lateral real confirmados.
- Painel real acedido por CDP após `chrome.sidePanel.open` com gesto controlado: validação PT e mensagem nativa `OPEN_TAB` permitida (`ok: true`); destino externo recusado. Pedidos aos websites de produção foram intercetados e abortados, sem login ou dados.
- Clipboard no documento aberto num separador funcionou em algumas execuções; nesse separador a abertura foi recusada, corretamente, pelo guard `sender.tab`. No painel headless, a cópia foi recusada e apresentou o fallback. **Fluxo completo copiar → abrir por clique no painel ainda requer teste humano Chrome/Edge.** Não se alargaram permissões para contornar a limitação.
- Screenshot do documento da extensão a 360 × 800 e 1280 × 1800, sem overflow; screenshot do painel nativo capturada. Não equivalem ao teste manual da barra do Chrome/Edge.
- Não foi testado Edge nativo, ícone físico, pesquisa autenticada com dados reais nem isolamento entre contas nesta entrega.

### Checklist do piloto humano — por executar
- [ ] Instalar Chrome e Edge sem erros e abrir pelo ícone.
- [ ] Navegar nas três secções por teclado e rato.
- [ ] Validar número PT; rejeitar `812345678` sem mostrar ações.
- [ ] Copiar e pesquisar com o painel nativo em foco.
- [ ] Recusa de clipboard mostra erro e não abre página.
- [ ] Website: sessão correta, workspace correto, pesquisa e ficha corretas.
- [ ] Mudar workspace limpa resultados/telefone.
- [ ] Não aparece telefone em URL nem resultados no painel.
- [ ] Recarregar/remover extensão sem impacto nos providers.

## Próximas decisões e riscos separados
OAuth/PKCE e resultados diretamente no painel exigem aprovação específica para backend seguro; não estão implementados. A migração 0079 e os alertas de segurança existentes são pendências separadas, não alteradas. Não houve SQL, migrações, scanner, dados, publicação, deploy ou envios.