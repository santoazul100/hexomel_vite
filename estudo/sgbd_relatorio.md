# Sistema de Gestão de Base de Dados - Hexomel

## 1. SGBD Escolhido

**MySQL Community Server 8.0.44**

Motor de armazenamento: **InnoDB**

---

## 2. Justificação da Escolha

### Porquê MySQL?

1. **Padrão da Indústria**: MySQL é um dos SGBD mais utilizados no mundo (usado por Facebook, YouTube, Netflix)
2. **Open Source**: Gratuito e com grande comunidade de suporte
3. **Desempenho**: Otimizado para leitura rápida, ideal para e-commerce
4. **Escalabilidade**: Suporta milhões de registos e múltiplos utilizadores simultâneos
5. **Compatibilidade**: Funciona perfeitamente com Node.js (backend da aplicação)
6. **Adequado para PAP**: Demonstra competência em bases de dados relacionais profissionais

### Porquê InnoDB?

- **Suporte a transações ACID**: Garante integridade dos dados
- **Foreign Keys**: Integridade referencial entre tabelas
- **Row-level locking**: Múltiplos utilizadores podem editar dados simultaneamente
- **Recuperação automática**: Em caso de falha do sistema

---

## 3. Arquitetura da Base de Dados

### Diagrama Relacional

```
┌─────────────┐
│   cliente   │───┐
└─────────────┘   │
       │          │
       │          ├──────┐
       │          │      │
       ▼          ▼      ▼
┌─────────┐  ┌──────────┐  ┌─────────┐
│ morada  │  │ carrinho │  │favoritos│
└─────────┘  └──────────┘  └─────────┘
                   │             │
                   ▼             │
            ┌──────────────┐    │
            │item_carrinho │    │
            └──────────────┘    │
                   │             │
                   │             │
       ┌───────────┴─────────────┘
       │           │
       ▼           ▼
  ┌─────────┐  ┌──────────┐
  │ produto │  │avaliacao │
  └─────────┘  └──────────┘
       │
       │
       ▼
  ┌──────────────┐
  │  encomenda   │
  └──────────────┘
       │
       ▼
  ┌──────────────────┐
  │ item_encomenda   │
  └──────────────────┘
```

---

## 4. Estrutura das Tabelas

### 4.1 Tabela `cliente`

**Função**: Armazena informação dos utilizadores registados

| Campo          | Tipo                     | Descrição                      |
| -------------- | ------------------------ | ------------------------------ |
| ID_Cliente     | INT (PK, AUTO_INCREMENT) | Identificador único            |
| Nome           | VARCHAR(120)             | Nome completo                  |
| Email          | VARCHAR(120) UNIQUE      | Email (login)                  |
| Senha          | VARCHAR(255)             | Password encriptada (bcrypt)   |
| Telefone       | INT(9)                   | Contacto telefónico            |
| Picture        | TEXT                     | URL da foto de perfil (Google) |
| Level          | INT                      | Nível de gamificação           |
| Pontos         | INT                      | Pontos acumulados              |
| XP             | INT                      | Experiência do utilizador      |
| Badges         | TEXT                     | Medalhas em JSON               |
| Data_Resgistro | TIMESTAMP                | Data de criação da conta       |

### 4.2 Tabela `produto`

**Função**: Catálogo de produtos disponíveis

| Campo        | Tipo          | Descrição            |
| ------------ | ------------- | -------------------- |
| ID_Produto   | INT (PK)      | Identificador único  |
| Nome         | VARCHAR(120)  | Nome do produto      |
| Preco        | DECIMAL(10,2) | Preço em euros       |
| Stock        | INT(30)       | Quantidade em stock  |
| ID_Categoria | INT           | Categoria do produto |
| Descricao    | TEXT          | Descrição detalhada  |
| Imagem       | VARCHAR(255)  | Caminho da imagem    |

### 4.3 Tabela `carrinho`

**Função**: Carrinhos de compras ativos

| Campo        | Tipo      | Descrição             |
| ------------ | --------- | --------------------- |
| ID_Carrinho  | INT (PK)  | Identificador único   |
| ID_Cliente   | INT (FK)  | Referência ao cliente |
| Data_Criacao | TIMESTAMP | Data de criação       |

**Foreign Key**: `ID_Cliente` → `cliente(ID_Cliente)` ON DELETE CASCADE

### 4.4 Tabela `item_carrinho`

**Função**: Produtos dentro de cada carrinho

| Campo           | Tipo     | Descrição              |
| --------------- | -------- | ---------------------- |
| ID_itemCarrinho | INT (PK) | Identificador único    |
| ID_Carrinho     | INT (FK) | Referência ao carrinho |
| ID_Produto      | INT (FK) | Referência ao produto  |
| Quantidade      | INT(30)  | Quantidade selecionada |

**Foreign Keys**:

- `ID_Carrinho` → `carrinho(ID_Carrinho)` ON DELETE CASCADE
- `ID_Produto` → `produto(ID_Produto)` ON DELETE CASCADE

### 4.5 Tabela `encomenda`

**Função**: Histórico de encomendas finalizadas

| Campo          | Tipo          | Descrição                          |
| -------------- | ------------- | ---------------------------------- |
| ID_Encomenda   | INT (PK)      | Identificador único                |
| ID_Cliente     | INT (FK)      | Cliente que fez a encomenda        |
| Data_Encomenda | TIMESTAMP     | Data da compra                     |
| Total          | DECIMAL(10,2) | Valor total pago                   |
| Status         | VARCHAR(50)   | Estado (Pendente/Enviado/Entregue) |

**Foreign Key**: `ID_Cliente` → `cliente(ID_Cliente)` ON DELETE CASCADE

### 4.6 Tabela `item_encomenda`

**Função**: Produtos em cada encomenda

| Campo            | Tipo          | Descrição                  |
| ---------------- | ------------- | -------------------------- |
| ID_ItemEncomenda | INT (PK)      | Identificador único        |
| ID_Encomenda     | INT (FK)      | Referência à encomenda     |
| ID_Produto       | INT (FK)      | Produto comprado           |
| Quantidade       | INT(30)       | Quantidade comprada        |
| Preco_Unitario   | DECIMAL(10,2) | Preço no momento da compra |

**Foreign Keys**:

- `ID_Encomenda` → `encomenda(ID_Encomenda)` ON DELETE CASCADE
- `ID_Produto` → `produto(ID_Produto)` ON DELETE CASCADE

### 4.7 Tabela `morada`

**Função**: Endereços de entrega dos clientes

| Campo      | Tipo         | Descrição            |
| ---------- | ------------ | -------------------- |
| ID_Morada  | INT (PK)     | Identificador único  |
| ID_Cliente | INT (FK)     | Cliente proprietário |
| Morada     | VARCHAR(120) | Endereço completo    |

**Foreign Key**: `ID_Cliente` → `cliente(ID_Cliente)` ON DELETE CASCADE

### 4.8 Tabela `avaliacao`

**Função**: Reviews de produtos pelos clientes

| Campo          | Tipo              | Descrição                       |
| -------------- | ----------------- | ------------------------------- |
| ID_Avaliacao   | INT (PK)          | Identificador único             |
| ID_Produto     | INT (FK)          | Produto avaliado                |
| ID_Cliente     | INT (FK)          | Cliente que avaliou             |
| Nota           | INT(1) CHECK(1-5) | Classificação de 1 a 5 estrelas |
| Comentario     | VARCHAR(500)      | Texto da review                 |
| Data_Avaliacao | TIMESTAMP         | Data da publicação              |

**Foreign Keys**:

- `ID_Produto` → `produto(ID_Produto)` ON DELETE CASCADE
- `ID_Cliente` → `cliente(ID_Cliente)` ON DELETE CASCADE

### 4.9 Tabela `favoritos`

**Função**: Lista de produtos favoritos de cada cliente

| Campo       | Tipo     | Descrição            |
| ----------- | -------- | -------------------- |
| ID_Favorito | INT (PK) | Identificador único  |
| ID_Cliente  | INT (FK) | Cliente proprietário |
| ID_Produto  | INT (FK) | Produto favoritado   |

**Foreign Keys**:

- `ID_Cliente` → `cliente(ID_Cliente)` ON DELETE CASCADE
- `ID_Produto` → `produto(ID_Produto)` ON DELETE CASCADE

**Unique Constraint**: (ID_Cliente, ID_Produto) - Um cliente não pode favoritar o mesmo produto duas vezes

---

## 5. Características Técnicas

### 5.1 Integridade Referencial

Todas as Foreign Keys usam `ON DELETE CASCADE`, garantindo que:

- Ao eliminar um cliente, todos os seus carrinhos, moradas e favoritos são removidos automaticamente
- Ao eliminar um produto, todas as referências em carrinhos e favoritos são limpas
- Não existem "órfãos" na base de dados

### 5.2 Segurança

1. **Prepared Statements**: Todas as queries usam parametrização (previne SQL Injection)
2. **Passwords Encriptadas**: Bcrypt com salt de 10 rounds
3. **Constraints**: CHECK constraints garantem validação de dados (ex: Nota entre 1-5)
4. **UNIQUE**: Email único impede duplicação de contas

### 5.3 Otimização

1. **Índices Automáticos**: Primary Keys e Foreign Keys criam índices automaticamente
2. **Connection Pool**: Backend usa pool de 10 conexões para melhor desempenho
3. **InnoDB Cache**: Buffer pool otimiza leituras frequentes
4. **Timestamps**: Campos `TIMESTAMP` permitem ordenação eficiente de históricos

### 5.4 Transações ACID

- **Atomicidade**: Checkout completa TODA a encomenda ou reverte tudo
- **Consistência**: Foreign keys garantem coerência
- **Isolamento**: Row-level locking evita conflitos
- **Durabilidade**: Commits são persistidos em disco

---

## 6. Normalização

A base de dados está na **3ª Forma Normal (3NF)**:

1. **1NF**: Todos os campos são atómicos (não há arrays)
2. **2NF**: Todas as colunas dependem da chave primária completa
3. **3NF**: Nenhuma dependência transitiva (ex: Preco_Unitario é guardado em `item_encomenda` para não depender de `produto.Preco`)

---

## 7. Vantagens para o Projeto Hexomel

1. **Escalabilidade**: Suporta crescimento do negócio
2. **Confiabilidade**: Transações garantem consistência em vendas
3. **Desempenho**: Queries otimizadas com índices
4. **Manutenção**: Estrutura clara facilita alterações futuras
5. **Backup**: Ferramentas nativas (`mysqldump`)
6. **Portabilidade**: Funciona em Windows, Linux, macOS

---

## 8. Configuração no Projeto

### Credenciais (`.env`)

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=admin123
DB_NAME=hexomel
```

### Connection Pool (Node.js)

```javascript
pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "admin123",
  database: "hexomel",
  connectionLimit: 10,
});
```

---

## 9. Conclusão

O uso do MySQL com InnoDB demonstra uma escolha profissional adequada para uma aplicação e-commerce. A estrutura relacional garante integridade dos dados, enquanto as otimizações permitem boa performance mesmo com múltiplos utilizadores simultâneos.

**Total de tabelas**: 9  
**Total de relações**: 8 foreign keys  
**Capacidade estimada**: Milhares de produtos, centenas de utilizadores simultâneos
