# Documentação Técnica: Sistema de Comunidade Q&A (Hexomel)

## 1. Introdução
Como complemento à página educacional "Curiosidades do Mel", foi desenvolvido um sistema dinâmico de Perguntas e Respostas (Q&A) inspirado no formato de fóruns (como o Reddit). Este sistema permite uma interação direta e valiosa entre os clientes da Hexomel e os Apicultores registados na plataforma.

## 2. Estrutura da Base de Dados (MySQL)
Para suportar esta funcionalidade, foram adicionadas duas novas tabelas relacionais ao esquema da base de dados através de migrações automáticas:

### 2.1. Tabela `pergunta_comunidade`
Armazena os tópicos/dúvidas principais submetidos pelos utilizadores.
- `ID_Pergunta` (INT, PK, Auto Increment)
- `ID_Cliente` (INT, FK) -> Referência ao autor da pergunta.
- `Texto` (TEXT) -> O conteúdo da pergunta.
- `Votos` (INT) -> Sistema de upvotes (default: 0).
- `Data_Criacao` (TIMESTAMP) -> Registo automático da data e hora.

### 2.2. Tabela `resposta_comunidade`
Armazena as respostas associadas a uma pergunta específica.
- `ID_Resposta` (INT, PK, Auto Increment)
- `ID_Pergunta` (INT, FK) -> A que pergunta esta resposta pertence.
- `ID_Cliente` (INT, FK) -> Autor da resposta (Cliente normal ou Apicultor).
- `Texto` (TEXT) -> O conteúdo da resposta.
- `Votos` (INT) -> Sistema de upvotes para a resposta.
- `Melhor_Resposta` (BOOLEAN) -> Flag para destacar a resposta definitiva.
- `Data_Criacao` (TIMESTAMP)

## 3. Lógica de Negócio e Endpoints (API REST)
O servidor Node.js/Express (`server.js`) gere a comunicação através dos seguintes endpoints:

- **`GET /api/comunidade/perguntas`**: Recolhe todas as perguntas, efetua `JOIN` com a tabela `cliente` para obter os dados do autor (Nome, Foto, Tipo de Utilizador) e agrupa as respostas correspondentes. A ordenação das respostas dá prioridade aos Apicultores e às respostas marcadas como "Melhor_Resposta", e, em seguida, pelo número de votos.
- **`POST /api/comunidade/perguntas`**: Requer autenticação (JWT). Insere uma nova pergunta. O backend valida se o texto tem o tamanho mínimo exigido.
- **`POST /api/comunidade/perguntas/:id/respostas`**: Permite a um utilizador autenticado submeter uma resposta a uma pergunta existente.
- **`POST /api/comunidade/perguntas/:id/votar`** & **`POST /api/comunidade/respostas/:id/votar`**: Mecanismo de incremento de popularidade (Upvotes). Requer autenticação.
- **`DELETE /api/comunidade/perguntas/:id`** & **`DELETE /api/comunidade/respostas/:id`**: Rotas que permitem a remoção de mensagens. O backend verifica o token JWT e garante que apenas o autor da mensagem (`ID_Cliente === req.user.id`) ou um utilizador com `role === 'admin'` pode efetuar a exclusão. Para as perguntas, ao serem apagadas, as respostas associadas também são removidas.

## 4. Filtro de Profanidade (Moderação Automática)
Para garantir que a secção da comunidade se mantém num ambiente familiar e seguro, foi implementada uma função de moderação (`censorText`) nas rotas de criação (POST) de perguntas e respostas.
1. **API PurgoMalum**: A aplicação faz um pedido HTTP dinâmico à API gratuita *PurgoMalum* (`https://www.purgomalum.com`), que deteta linguagem obscena em vários idiomas e substitui os termos por asteriscos (`***`).
2. **Fallback Local**: Como camada adicional de segurança e robustez para calão específico de Portugal, o sistema inclui um dicionário local de fallback (`localBadWords`).
3. O texto resultante é então guardado na base de dados já devidamente higienizado, assegurando uma proteção ativa contra linguagem imprópria.

## 5. Integração Frontend (`comunidade.js`)
O frontend utiliza a API DOM moderna para construir a interface de utilizador em tempo real, sem necessidade de recarregar a página (Single Page Application UX):

- **Renderização Dinâmica**: Os templates HTML são gerados com `template literals`, permitindo injeção segura (via escape de HTML para prevenção de XSS) de dados variáveis.
- **Destaque Visual para Apicultores**: O algoritmo verifica se `AutorTipo` é `apicultor` (ou `admin`). Se for, a resposta é formatada com classes CSS (`qa-answer-beekeeper`), recebendo um fundo diferenciado, o badge "Apicultor Verificado" e avatares com as cores da marca (Verde Floresta e Ouro).
- **Gestão de Mensagens**: Quando a página processa cada pergunta ou resposta, compara o ID do autor com o do utilizador autenticado (`this.user`). Se for o próprio ou um Admin, é renderizado dinamicamente um botão de "lixo" (`.qa-delete-btn`) acompanhado de um SweetAlert2 de confirmação que impede eliminações acidentais.
- **Gestão de Sessão (JWT)**: O script `comunidade.js` interceta retornos HTTP `401 Unauthorized`. Se a sessão (token JWT no `localStorage`) expirar, o frontend limpa o armazenamento local e apresenta um alerta moderno utilizando a biblioteca **SweetAlert2**, redirecionando o utilizador para o fluxo de autenticação.

## 6. Experiência de Utilizador (UX/UI)
- **Glassmorphism & Animações**: Elementos visuais flutuantes (abelhas) e transições suaves (`animate-fade-up`) garantem uma estética orgânica.
- **SweetAlert2**: Substituição total das caixas de diálogo nativas do browser por popups estilizados e responsivos (SweetAlert2) para confirmações de eliminação, alertas de erro, sucesso ou expiração de sessão.
