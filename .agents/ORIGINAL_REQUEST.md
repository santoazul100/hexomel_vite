# Original User Request

## Follow-up — 2026-06-30T23:13:42Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Fix codebase bugs without breaking express routes

The goal is to implement fixes for 9 critical backend logic bugs (stock leaks, missing transactions, low stock block) and 3 frontend bugs (date parsing crash, MB Way hardcoded to card, checkout button out of form), without breaking the existing Express routing.

Working directory: c:\escola\pap\code\hexomel_vite
Integrity mode: development

## Requirements

### R1. Implement Database Transactions in Checkout
Rewrite the `/api/cart/checkout` and `/api/checkout/create-session` routes in `backend/server.js` to use `await db.transaction()`. Move stock deductions (`produto.Stock` and `workshop.Vagas`) out of the initial draft creation, leaving them to be checked at checkout but only deducted upon actual payment (in `fulfillPaidOrder`). Ensure `Preco_Unitario` is recorded for workshops.

### R2. Maintain Express Routes Integrity
You MUST strictly preserve the Express router declarations (`app.post(...)`). Do not delete or overwrite the route function definitions. Fix the code inside the routes safely.

### R3. Fix Frontend Crashes and Logic
In `frontend/src/profile.js`, implement a safe date parsing function to prevent `RangeError`. In `frontend/src/checkout.js`, allow the `paymentType` to capture "mbway" directly for local payments. Fix the UI location of the submit button in `frontend/checkout.html`.

## Acceptance Criteria

### Syntax and Runtime Safety
- [ ] `node -c backend/server.js` passes without any SyntaxError.
- [ ] The backend server can start successfully on port 3000 without crashing.

### Logic Correctness
- [ ] The checkout routes execute within a SQL transaction, reverting if an error is thrown.
- [ ] Abandoned pending orders do not leak stock (stock is only deduced upon `Pago` status).
- [ ] The frontend profile page loads successfully without a `RangeError`.
- [ ] Local MB Way checkout completes successfully via native UI.
