# DD Auto Spa System

An offline-first local management system for DD Auto Spa. It will replace the owner's
spreadsheet workflow for service sales, tire inventory, canteen inventory, purchases,
expenses, attendance, payroll, daily closing, and reports.

The current foundation includes the local database, first-time owner setup, username/password
login, protected SPA shell, session security, one-time password recovery, audit events, and the
owner-managed business catalogs for employees, vehicle classes, services, and service prices.
Business transactions and real business data are intentionally not included yet.

## Technology

- React and Vite for the browser interface
- Tailwind CSS for styling
- Node.js and Express for the local API
- SQLite for local storage
- Vitest for automated tests
- ESLint and Prettier for code quality

## Requirements

- Node.js 24 LTS
- npm 11 or newer
- Git

## Development

```powershell
npm install
npm run dev
```

The web application runs at `http://localhost:5173`. The Vite development server forwards
`/api` requests to the Express server at `http://localhost:3000`.

Useful commands:

```powershell
npm run lint
npm run format:check
npm test
npm run build
npm run check
```

After building the web application, run the production server with:

```powershell
npm run build
npm start
```

The production application is then available at `http://127.0.0.1:3000`.

## First-time setup and local data

The first launch displays a one-time owner-account setup screen. The password must contain at
least 12 characters, including uppercase, lowercase, and a number. Setup generates a printable
one-time recovery code. The code is stored only as a hash and must be kept somewhere private.

By default, Windows business data is stored outside the source-code folder:

```text
%LOCALAPPDATA%\DD Auto Spa\data\ddauto-spa.db
```

Developers and tests may override the folder with the `DDAUTO_DATA_DIR` environment variable.
Never point it at a Git-tracked directory for real business use.

## Repository structure

```text
ddauto-spa-system/
|-- apps/
|   |-- server/              Express API, SQLite migrations, and feature modules
|   `-- web/                 React single-page application
|-- packages/
|   `-- contracts/           Shared constants and validation contracts
|-- .github/workflows/       Automated repository checks
|-- AGENTS.md                Working agreement for Codex and contributors
`-- package.json             Workspace commands and shared tooling
```

The server will use feature modules with route, controller, service, repository, and schema
layers where those layers provide real value. This keeps the application understandable
without forcing every small feature into unnecessary files.

## Authentication foundation

- Passwords are derived with Node.js `scrypt` and unique random salts.
- The browser receives an HTTP-only, SameSite=Strict session cookie.
- Only a SHA-256 hash of the random session token is stored in SQLite.
- Sessions expire after 15 minutes of inactivity and have a 12-hour absolute limit.
- State-changing authenticated requests require a separate CSRF token.
- Repeated authentication failures are rate-limited.
- Setup, login, logout, and password-reset activity is recorded in the audit log.

## Business setup catalogs

The owner can complete the reusable setup under **Settings** before recording transactions:

- Employees, including a fixed full-day rate, labor-share eligibility, and the single active
  graphene/detailing specialist
- Vehicle classes used as columns in the service-price matrix
- Services and their ordinary or specialist labor rule
- Service prices for each active service and vehicle-class combination

Carwash, Graphene/Ceramic, Painting, Detailing, and Vulcanizing/Tire Change are seeded as
editable services. Prices and employee rates are stored as integer centavos. Catalog records
are archived and restored instead of being hard-deleted, and every owner mutation requires a
valid session and CSRF token and creates an audit event.

## Public-repository safety

This repository contains source code only. Never commit real customer information, passwords,
recovery codes, `.env` files, SQLite databases, backups, logs, or the owner's Excel workbook.
Those files are blocked by `.gitignore`, but every commit must still be reviewed before it is
pushed.

## License

No open-source license has been granted. The repository is publicly visible, but the code
remains copyrighted by its owner unless a license is added later.
