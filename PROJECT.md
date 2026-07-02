# Project: Hexomel Codebase Audit

## Architecture
- **Frontend**: Vite-based static pages (in `frontend/src` and `frontend/*.html`). Consumes REST API of backend.
- **Backend**: Express-based server (in `backend/server.js`) connected to MySQL database (config in `backend/config/db.js`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Investigation | Scan codebase, identify bugs in checkout/reservation/visual states/invalid records. | none | DONE |
| 2 | Implementation | Implement fixes in frontend and backend. | 1 | IN_PROGRESS |
| 3 | Verification | Run tests, verify with Reviewer, Challenger, and Forensic Auditor. | 2 | PLANNED |
| 4 | Reporting | Hand off the clean codebase and report results to user. | 3 | PLANNED |

## Interface Contracts
### Frontend ↔ Backend REST API
- `POST /api/checkouts` (or equivalent) - process cart, checkout, reservation.
- `GET /api/workshops` / `POST /api/reservations` - workshop list and booking.
- `GET /api/orders` - retrieve client orders and states.
