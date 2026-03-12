# Relatório Técnico e de Estudo: Projeto Hexomel

Este documento consolida toda a informação técnica, arquitetural e de base de dados do projeto Hexomel, preparado para a Prova de Aptidão Profissional (PAP).

---

## 1. Visão Geral do Projeto
O **Hexomel** é uma plataforma premium de e-commerce para mel português, desenvolvida com foco em performance, design minimalista e interatividade dinâmica.

### Tecnologias Core:
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (JS Puro) e Vite.
- **Backend**: Node.js com framework Express.
- **Base de Dados**: MySQL Community Server 8.0.
- **Gestão de BD**: MySQL Workbench.

---

## 2. Arquitetura do Sistema
O projeto segue uma estrutura de **Single Page Application (SPA) logic** no frontend com uma **API RESTful** no backend.

- **Comunicação**: O frontend comunica com o servidor via `Fetch API`, utilizando tokens **JWT** para autenticação segura.
- **Segurança**: As passwords são protegidas com `bcryptjs` (hashing) e os acessos são validados por middlewares no servidor.
- **Assets**: Imagens enviadas pelos utilizadores são armazenadas em `frontend/public/uploads/`.

---

## 3. Base de Dados (SGBD: MySQL)

### Justificação Técnica
- **Robustez**: O MySQL com o motor **InnoDB** garante a integridade dos dados através de Transações ACID e Foreign Keys.
- **Escalabilidade**: Preparado para lidar com múltiplos utilizadores e grandes volumes de produtos.
- **Padrão Profissional**: O uso do MySQL Workbench demonstra um domínio de ferramentas padrão da indústria.

### Estrutura (Tabelas Principais)
1. **`cliente`**: Gere perfis de Clientes, Apicultores e Administradores.
2. **`produto`**: Catálogo com associações a Apicultores e Categorias.
3. **`encomenda`**: Registo de vendas com cálculo automático de faturação.
4. **`workshop`**: Eventos dinâmicos organizados pelos apicultores.
5. **`avaliacao`**: Sistema de feedback com notas de 1 a 5 estrelas.

---

## 4. Guia de Gestão (MySQL Workbench)
Para gerir o projeto de forma profissional, utilizamos exclusivamente o **MySQL Workbench**:
1. **Ligação**: Ligar ao `localhost` usando o utilizador `root`.
2. **Visualização**: No painel "Schemas", a base de dados `hexomel` contém toda a estrutura.
3. **Setup**: Em caso de necessidade de reset, o comando `npm run db:setup` na pasta `backend` re-inicializa toda a estrutura automaticamente.

---

## 5. Funcionalidades de Design (Bee System)
- **BeeAnimator**: Um sistema de animação procedural que gera abelhas dinâmicas que reagem ao rato (Parallax) e mudam de orientação dependendo da posição no ecrã, criando uma experiência "Premium" e viva.

---

## 6. Credenciais de Teste (Admin)
- **Email**: `admin@hexomel.pt` (ou `adminteste@gmail.com`)
- **Password**: `admin123`

---
*Este relatório foi gerido e compactado para servir de base à documentação final da PAP.*
