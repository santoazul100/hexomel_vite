# Hexomel Bug Fix Plan

## Objectives
Fix 9 critical backend logic bugs and 3 frontend bugs, while maintaining Express routing integrity, ensuring transactional safety, and preventing stock leaks.

## Milestones

### Milestone 1: Exploration and Codebase Analysis
- **Goal**: Scan codebase to identify exact locations, structures, database tables, and route definitions for backend and frontend issues.
- **Verification**: Explorer produces an investigation report (`handoff.md` or `analysis.md`) detailing:
  - Route function bounds in `backend/server.js`.
  - Database schema for `produto`, `workshop`, `encomendas`, `reservas`.
  - How `fulfillPaidOrder` transitions states and where stock should be deducted.
  - Date parsing in `profile.js` and RangeError cause.
  - MB Way logic in `checkout.js`.
  - Submit button in `checkout.html`.

### Milestone 2: Backend Implementation
- **Goal**: Rewrite `/api/cart/checkout` and `/api/checkout/create-session` to run within a database transaction. Ensure stock deductions are deferred to `fulfillPaidOrder` upon payment state change. Ensure `Preco_Unitario` is recorded for workshops.
- **Verification**: Synthesized review and local syntax check (`node -c backend/server.js`).

### Milestone 3: Frontend Implementation
- **Goal**: Fix date parsing RangeError in `profile.js`, MB Way payment option in `checkout.js`, and move the submit button inside the form in `checkout.html`.
- **Verification**: UI component inspections.

### Milestone 4: System Verification & Auditing
- **Goal**: Run test scripts, execute verification scenarios using a Challenger, review code using Reviewer, and pass the Forensic Integrity Auditor check.
- **Verification**: Clean audit verdict, all tests pass.

### Milestone 5: Reporting & Handoff
- **Goal**: Deliver the clean, verified codebase to the user and report completion to the sentinel.
- **Verification**: Signed handoff report and communication sent.
