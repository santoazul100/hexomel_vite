# 🔐 Credenciais do Projeto Hexomel

## Admin Dashboard

| Campo    | Valor                  |
|----------|------------------------|
| User     | admin                  |
| Password | admin                  |
| URL      | http://localhost:5173/admin.html |

---


> ⚠️ Atenção: Estas são as passwords do ambiente de desenvolvimento/teste.
> Após correr o seed (`node backend/scripts/seed_db.js`), corre sempre:
> `node backend/reset_admin.js` para restaurar as passwords.


---

## Base de Dados MySQL

| Campo    | Valor     |
|----------|-----------|
| Host     | localhost |
| Port     | 3306      |
| Database | hexomel   |
| User     | root      |
| Password | definida em `backend/.env`   |

---

## Ambiente no PC Novo

O backend passa agora a ler sempre o ficheiro `backend/.env`, mesmo quando arrancas o projeto a partir da raiz.

Se precisares de recriar a configuração:

`backend/.env.example` -> copiar para `backend/.env` e ajustar os valores locais.

## Servidor Backend

| Campo | Valor                      |
|-------|----------------------------|
| URL   | http://localhost:3000      |
| Dev   | `npm run dev` (na pasta raiz) |
