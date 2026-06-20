# Documentação Técnica: Sistema de Chat Privado (Hexomel)

## 1. Introdução
O sistema de **Mensagens Privadas (Chat)** da Hexomel foi desenvolvido para permitir a comunicação direta, fluida e segura entre todos os membros da comunidade (Clientes, Apicultores e Administradores). Este sistema foi migrado do antigo painel de perfil e agora está integrado na página de rede social **HexoHive** (`rede-social.html`), apresentando um design premium inspirado no Direct Messages do Instagram. A lógica baseia-se numa arquitetura de *polling* automático de mensagens em tempo real no frontend controlada pela classe `SocialNetworkUI` em `rede-social.js`, suportada por uma API REST no backend.

---

## 2. Estrutura da Base de Dados (MySQL)
Três tabelas principais suportam a lógica de mensagens, bloqueios e moderação direta:

### 2.1. Tabela `mensagem_privada`
Gere o histórico de mensagens trocadas entre utilizadores.
- `ID_Mensagem` (INT, PK, Auto Increment)
- `ID_Remetente` (INT, FK) -> Utilizador que envia a mensagem.
- `ID_Destinatario` (INT, FK) -> Utilizador que recebe a mensagem.
- `Texto` (TEXT) -> O conteúdo da mensagem (higienizado por filtro de censura).
- `Data_Envio` (TIMESTAMP) -> Registo automático do momento de envio.
- `Lida` (BOOLEAN) -> Indica se o destinatário já abriu a conversa (Default: FALSE).

### 2.2. Tabela `bloqueio`
Registos de interações de bloqueio ativo para impedir mensagens indesejadas.
- `ID_Bloqueador` (INT, PK, FK) -> O utilizador que efetuou o bloqueio.
- `ID_Bloqueado` (INT, PK, FK) -> O utilizador que foi bloqueado.
- `Data_Bloqueio` (TIMESTAMP) -> Data/hora da ação.

### 2.3. Tabela `denuncia`
Armazena reports de comportamentos inadequados efetuados no chat ou fóruns.
- `ID_Denuncia` (INT, PK, Auto Increment)
- `ID_Denunciante` (INT, FK) -> Quem reportou.
- `ID_Denunciado` (INT, FK) -> Quem foi reportado.
- `Tipo_Item` (VARCHAR) -> 'mensagem' para denúncias efetuadas a partir do chat.
- `ID_Item` (INT) -> ID de referência (ex: ID da conversa/utilizador).
- `Texto_Item` (TEXT) -> Conteúdo ou contexto da denúncia.
- `Motivo` (TEXT) -> Descrição textual fornecida pelo denunciante.
- `Status` (VARCHAR) -> 'Pendente' ou 'Resolvido'.

---

## 3. O Fluxo de Inicialização de Conversas ("Novo Chat")

Quando um utilizador clica em "Enviar Mensagem Privada" (nos perfis de apicultores, rede social ou perguntas e respostas), é redirecionado para a URL da HexoHive com os seguintes parâmetros de query:
`rede-social.html?chatWith=<ID_DO_UTILIZADOR>`

Durante o carregamento da HexoHive, a classe `SocialNetworkUI` executa o método `checkInitialParams()`. Se detetar a presença de `chatWith` ou do parâmetro `tab=chat`, ativa dinamicamente a aba de Mensagens Diretas (`#btn-show-chat`), oculta o diretório de membros e executa o método `fetchConversations()` para desenhar o painel de conversas em estilo Instagram.

### 3.1. Quando aparece o item "Novo Chat"?
O frontend verifica se o ID contido em `chatWith` já se encontra na lista de conversas ativas (retornada pelo backend via `/api/messages/conversations`).
Se o ID **não existir** nas conversas ativas:
1. O frontend faz uma chamada à API `/api/users/:id` para obter os dados públicos básicos do parceiro (Nome, Foto).
2. Cria e injeta temporariamente um elemento HTML no topo da lista de conversas com:
   - Um badge amarelo distintivo com o texto **"Novo Chat"**.
   - O subtítulo **"Escreva uma mensagem..."**.
3. Abre automaticamente a janela de conversação ativa para este utilizador (`window.openChat`).
4. **Limpeza de URL**: Para evitar comportamentos indesejados ao recarregar a página, a função `openChat` limpa imediatamente a query da URL usando:
   `window.history.replaceState({}, document.title, window.location.pathname);`

### 3.2. Quando desaparece o item "Novo Chat"?
O item de "Novo Chat" é temporário e o seu estado altera-se com base nas ações do utilizador:
* **Se o utilizador enviar uma mensagem:**
  A mensagem é enviada ao servidor (`POST /api/messages/send`) e guardada na base de dados na tabela `mensagem_privada`. O frontend atualiza a lista de conversas. Como agora já existe um registo na base de dados, a conversa passa a ser uma conversa regular. O badge **"Novo Chat" desaparece** e é substituído pela última mensagem enviada ("*Tu: <mensagem>*").
* **Se o utilizador recarregar a página ou navegar para fora antes de enviar mensagens:**
  Como a URL já foi limpa e não existem mensagens trocadas na base de dados para este par de utilizadores, a API `/api/messages/conversations` não retornará este chat. O item **desaparece completamente** da lista de conversas na próxima sessão.

---

## 4. Endpoints da API REST (Backend)

- **`GET /api/messages/conversations`**: Lista todas as conversas do utilizador logado. Para cada parceiro de conversa, calcula o número de mensagens por ler, o estado do bloqueio mútuo e a última mensagem trocada.
- **`GET /api/messages/history/:otherUserId`**: Retorna todo o histórico de mensagens entre o utilizador logado e outro membro, ordenado por data cronológica. Retorna também se existe um bloqueio ativo de parte a parte.
- **`POST /api/messages/send`**: Envia uma mensagem. Verifica no backend se:
  - O remetente tem restrições de escrita (`Restrito_Postar = 1`).
  - O destinatário existe.
  - Existe um bloqueio ativo entre os dois utilizadores (retorna `403 Forbidden` se estiver bloqueado).
  - Higieniza o texto (filtro de profanidade).
- **`POST /api/messages/read/:otherUserId`**: Marca todas as mensagens recebidas deste parceiro como lidas (`Lida = 1`).
- **`POST /api/users/block/:targetUserId`** / **`POST /api/users/unblock/:targetUserId`**: Cria/remove registo de bloqueio na base de dados.
- **`POST /api/reports/create`**: Cria uma denúncia contra o utilizador indicado.

---

## 5. UI de Moderação e Ações Rápidas (Design Premium)
No cabeçalho do painel de chat ativo na HexoHive, são disponibilizados dois botões de ação rápida:
1. **Denunciar (Flag)**: Abre um SweetAlert2 do tipo `textarea` para fundamentar a queixa e envia para `/api/reports/create`.
2. **Bloquear/Desbloquear (Ban)**: Permite banir o contacto. Altera o estado do botão no cabeçalho em tempo real e desativa a barra de inserção de texto no fundo do chat com mensagens apropriadas ("*Desbloqueie este utilizador para enviar mensagens*" ou "*Este utilizador bloqueou-te*").

**Design Premium Split-Pane (Instagram-like)**:
* **Layout Responsivo**: Em ecrãs grandes, apresenta uma coluna lateral à esquerda para a lista de conversações ativas e uma área de chat à direita para ler e enviar mensagens.
* **Consistência Visual**: Os botões de ação rápida no cabeçalho utilizam a classe CSS premium `.chat-header-btn` para garantir que são renderizados como círculos perfeitos de `32px` com micro-transições suaves ao passar o rato (hover), evitando distorções ovais do Bootstrap por preenchimento de padding nativo.
* **Transições SPA**: O utilizador pode alternar entre "Explorar Membros" e "Mensagens Diretas" instantaneamente sem reloads de página através de botões interruptores animados com o estado ativo/inativo estilizado em gradientes verde-dourados.
