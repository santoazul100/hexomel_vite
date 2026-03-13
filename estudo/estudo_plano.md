# Plano de Estudo e Documentação

## 1. Tecnologias Utilizadas
- **Frontend**: Vite + Vanilla JavaScript (ES6+), Vanilla CSS (Design System centralizado em `modern.css`)
- **Backend**: Node.js + Express
- **Base de Dados**: MySQL (Driver `mysql2`) gerida via **MySQL Workbench**
- **Segurança**: JWT, bcryptjs, Google Auth (OAuth 2.0)

## 2. Gestão de Dados
O sistema utiliza uma base de dados MySQL para armazenar toda a informação do site.

### Por que não usamos SQLite ou phpMyAdmin?
- **MySQL vs SQLite**: O MySQL foi escolhido pela sua robustez, suporte a chaves estrangeiras complexas e melhor tratamento de acessos concorrentes.
- **MySQL Workbench**: É a ferramenta padrão para gerir a base de dados. Evitamos o uso do WAMP/phpMyAdmin para manter o ambiente de desenvolvimento mais limpo e profissional, utilizando o Workbench para modelação e execução de queries SQL.

## 3. Estrutura da Base de Dados
Tabelas principais:
- `cliente`: Armazena utilizadores (Clientes, Apicultores, Admins).
- `produto`: Catálogo de mel e derivados.
- `encomenda`: Registos de compras.
- `categoria`: Categorização dos produtos.
- `workshop`: Eventos organizados por apicultores.

## 4. Localização dos Dados
- **Dados Estruturados**: MySQL (`hexomel`)
- **Imagens/Ficheiros**: `frontend/public/uploads/` (o caminho é guardado no MySQL)
- **Estilos Premium**: `frontend/src/styles/modern.css` (centraliza a identidade visual)

## 5. Notas Importantes
- O código do backend utiliza um adaptador no ficheiro `db.js` para facilitar a manipulação do MySQL, mantendo uma sintaxe simples e eficiente.
- Todas as passwords são encriptadas antes de serem guardadas.
