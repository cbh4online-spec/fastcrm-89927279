# Quatro avisos graves de ficheiros

## Estado atual
Os quatro avisos graves já foram corrigidos na mensagem anterior. A verificação de segurança desta mensagem já não mostra nenhum aviso grave.

| Aviso | O que mudou |
|---|---|
| Anexos de contexto podiam ser descarregados por outros | Só os membros do espaço de trabalho dono do anexo os veem, enviam ou apagam |
| Documentos analisados podiam ser descarregados por outros | Só os membros do espaço de trabalho dono do documento os veem ou apagam |
| Capturas de erros reportados podiam ser descarregadas por outros | Só quem enviou a captura e o super admin a veem |
| Imagens dos sites do construtor podiam ser substituídas por outros | Só o processo interno de clonagem de sites as cria ou altera |

## Passos propostos
1. Fazer uma nova verificação de segurança completa para confirmar que nenhum destes avisos volta a aparecer.
2. Testar com uma conta real da PHARLISS:
   - abrir um anexo de contexto;
   - abrir um documento analisado;
   - reportar um erro com captura.
   Confirmar que tudo continua a funcionar para o próprio utilizador.
3. Se algum destes fluxos falhar, ajustar apenas a regra desse tipo de ficheiro, sem voltar a abrir o acesso a outros utilizadores.

## Riscos
- Os anexos de contexto e as capturas de erros abrem com um link que não funciona em ficheiros privados. Se hoje não aparecem na aplicação, a causa é essa e não a correção. Pode ser corrigido à parte, passando a usar links temporários.
