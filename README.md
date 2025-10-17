# Backend API

Express + MySQL API for the tracking app. Provides auth, expenses, loans, loan repayments, goals, and currency endpoints.

## Prerequisites

- Node.js 18+ (recommend Node 20 LTS)
- npm
- MySQL 8 (or compatible) running locally or reachable over network

## Environment

- Copy example and edit values:
  - `cp backend/.env.example backend/.env`
- Required variables (see `backend/.env.example:1`):
  - `PORT` (default `4000`, see `backend/src/index.js:30`)
  - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
    - The schema uses database `finance_tracker` (see `backend/db/schema.sql:1`).
    - Either set `DB_NAME=finance_tracker` or align schema/DB to your chosen name.
    - Code default is `finance_tracker` (see `backend/src/db.js:9`).
  - `JWT_SECRET` (set a strong random value)

## Database setup

- Create schema and tables:
  - Using mysql CLI: `mysql -u <user> -p -h <host> < backend/db/schema.sql`
- Ensure your `.env` matches the DB credentials and database name.

## Install

- `cd backend`
- `npm install`

## Run (development)

- `npm run dev`
- The API listens on `http://localhost:4000` by default (configurable via `PORT`).
- Health check: `GET /` returns `{ status: "ok", service: "finance-tracker-api" }` (see `backend/src/index.js:19`).

## Run (production)

- `npm start`

## API Base and Routes

- Base URL: `/api` (see `backend/src/index.js:23`).
- Auth: `/api/auth` (register, login, profile)
- Expenses: `/api/expenses`
- Loans: `/api/loans`

## Using with the frontend

- The frontend dev server proxies `/api` to `http://localhost:4000` by default. Keep this backend running on port `4000` or update the frontend proxy target.
