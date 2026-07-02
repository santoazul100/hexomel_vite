## 2026-07-01T00:14:34Z
Role: Backend Stock & Schema Investigator
Working directory: c:\escola\pap\code\hexomel_vite\.agents\explorer_backend_stock
Objective:
Scan the backend code (`backend/server.js`, `backend/scripts`, and database schema files like `backend/hexomel_mysql.sql`) to understand database tables and order status logic.
Detail:
1. The exact tables and fields involved in orders, workshops, products, stock/vagas, reservations, and order items.
2. How order status is transitioned (e.g. `Pendente` to `Pago`), and where `fulfillPaidOrder` is located/implemented in `backend/server.js`.
3. How stock is currently checked and deducted, and how we can defer stock deduction from draft creation to actual payment.
4. How `Preco_Unitario` is recorded for workshops in orders/reservations and if it's currently missing or incorrect.
Deliver a structured analysis report to your working directory at `handoff.md` and send a message when done.
