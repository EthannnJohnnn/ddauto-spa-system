# DD Auto Spa System

An offline-first local management system for DD Auto Spa. It will replace the owner's
spreadsheet workflow for service sales, tire inventory, canteen inventory, purchases,
expenses, attendance, payroll, daily closing, and reports.

The current foundation includes the local database, first-time owner setup, username/password
login, protected SPA shell, session security, one-time password recovery, audit events, the
owner-managed business catalogs, daily service transactions with attendance and payroll previews,
and an audited tire-sales and inventory ledger. Canteen, general purchase and expense, final
payroll, closing, and combined-report workflows will be added in later phases. Real business data
is intentionally not included in the repository.

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
- Services and their ordinary, specialist, or external-contractor labor rule
- Service prices for each active service and vehicle-class combination

Carwash, Graphene/Ceramic, Painting, Detailing, and Vulcanizing/Tire Change are seeded as
editable services. Prices and employee rates are stored as integer centavos. Catalog records
are archived and restored instead of being hard-deleted, and every owner mutation requires a
valid session and CSRF token and creates an audit event.

## Service sales and daily labor

The **Service sales** page records one vehicle ticket with one or more service lines. It shows the
selected day's service-sales total, active transaction count, employee payroll preview, attendance,
meal deductions, and an individual transaction list. Tickets can be edited, voided, and restored by
the owner, with an audit reason preserved for void and restore actions.

- Ordinary services allocate the service's configured labor percentage among only the employees
  assigned to that service. Exact-cent remainders are allocated deterministically.
- Graphene/Ceramic and Detailing use the specialist percentage and are assigned to the active
  specialist employee.
- Orlan's fixed daily amount is a minimum when present: the system adds only the difference needed
  to reach his configured daily rate when his job labor is lower.
- Painting is an external-contractor service. The owner's manually entered painter name and labor
  cost are recorded separately and do not make the painter a regular employee.
- Assigned regular employees become present automatically. Each present employee defaults to a
  configurable meal cost currently set to ₱50 for the day.

Transaction rows snapshot the names, prices, labor policy, percentage, contractor cost, and worker
shares used at the time of sale so later catalog changes do not rewrite historical calculations.

## Tire sales and inventory

The **Tires & inventory** page keeps tire-product sales separate from service sales while providing
daily, weekly, and monthly summaries. Vulcanizing/Tire Change remains a service and does not reduce
tire-product stock.

- Tire products store a category, tube type, size, current unit cost, selling price, and low-stock
  threshold.
- A new product may include beginning inventory, or beginning stock may be recorded later as a
  separate document.
- Beginning inventory and purchases add stock, tire sales subtract stock, and physical-count or
  damage corrections use signed adjustments with a required reason.
- Documents may contain multiple distinct tire products and preserve product, quantity, cost, and
  selling-price snapshots for historical accuracy.
- The system rejects any create, edit, void, or restore action that would make a product's stock
  negative on any business date.
- The owner can edit products and documents, archive or restore products, and void or restore
  inventory documents. Status changes require a reason and remain in the audit history.

Period summaries show tire sales, units sold, estimated gross profit, purchases, inventory units,
inventory value at the product's current unit cost, and low/out-of-stock alerts.

## Public-repository safety

This repository contains source code only. Never commit real customer information, passwords,
recovery codes, `.env` files, SQLite databases, backups, logs, or the owner's Excel workbook.
Those files are blocked by `.gitignore`, but every commit must still be reviewed before it is
pushed.

## License

No open-source license has been granted. The repository is publicly visible, but the code
remains copyrighted by its owner unless a license is added later.
