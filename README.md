# DD Auto Spa System

An offline-first local management system for DD Auto Spa. It will replace the owner's
spreadsheet workflow for service sales, tire inventory, canteen inventory, purchases,
expenses, attendance, payroll, daily closing, and reports.

See [ROADMAP.md](ROADMAP.md) for the complete Phase 1-11 development history and approved future
work.

The current foundation includes the local database, first-time owner setup, username/password
login, protected SPA shell, session security, one-time password recovery, audit events, the
owner-managed business catalogs, daily service transactions with attendance and payroll previews,
an audited tire-sales and inventory ledger, an audited canteen-sales and stock ledger, purchases
and expenses, combined reporting, a dedicated attendance workspace, audited Period Close snapshots,
and an individual equipment condition register with linked purchase
and repair expenses. Real business data is intentionally not included in the repository.

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

## Payroll closing

The owner finalizes a business date from the **Service sales** page after checking attendance,
employee assignments, meal costs, and the payroll preview:

- Closing snapshots every employee's name, fixed daily rate, job labor, fixed-rate top-up, total
  pay, and meal cost for that run.
- A closed run automatically creates protected Salary and Staff Meal expense transactions. Stable
  internal category codes keep the automation working if the owner renames those category labels.
- Service-ticket and attendance changes are blocked for a closed date so finalized totals cannot
  drift away from their expense entries.
- Reopening requires an owner reason, voids the generated expenses, unlocks corrections, and keeps
  the original run in history. Closing again creates a new immutable run and replacement expenses.
- Payroll closing and reopening are owner-only, CSRF-protected, and recorded in the audit log.

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

## Canteen sales and inventory

The **Canteen** page records drinks, snacks, and other small items separately from service and tire
sales. Its daily, weekly, and monthly views follow the owner's workbook while replacing overwritten
spreadsheet totals with an audited stock ledger.

- Canteen products store a category, current unit cost, selling price, and low-stock threshold.
- A product can be opened with beginning inventory, followed by dated purchases, sales, and signed
  physical-stock adjustments.
- Multi-item documents snapshot product names, categories, costs, and selling prices so later
  catalog changes do not alter history.
- The system prevents any create, edit, void, or restore action that would make historical stock
  negative.
- Owner-only product and document changes are archived or voided with reasons and audit events.

Period summaries show canteen sales, units sold, estimated gross profit, purchases, current stock
value, and low/out-of-stock alerts.

## Purchases and expenses

The **Purchases & expenses** page provides daily, weekly, and monthly views of business outflows:

- Tire and canteen purchase reports reuse the existing inventory purchase documents as their source
  of truth. They can be requested together or filtered to tires or canteen without duplicating data.
- The owner can create and rename expense categories or archive and restore them with a reason.
  Utilities, supplies, repairs, staff meals, salaries, maintenance, materials, taxes, and other are
  available initially, while additional categories remain owner-managed.
- Manual expenses snapshot the category name and store their date, description, payee, reference,
  amount in integer centavos, and notes.
- Expense edits are owner-only. The user-facing delete behavior voids a transaction with a reason;
  voided transactions remain visible for audit and can be restored without affecting totals while
  voided.
- A date-range overview returns active purchase and expense totals, a category breakdown, and the
  complete active/voided history. The purchase tab can switch between all, tire-only, and
  canteen-only records.
- The owner can record and edit general expenses, delete or restore expenses and categories with a
  reason, and jump from a purchase to its source tire or canteen inventory section for detailed
  editing. Purchases can also be deleted or restored directly from the combined page.

The manual expense form cannot edit, delete, or restore payroll-generated entries. Corrections must
be made by reopening the source payroll date so the payroll snapshots and expense history remain
synchronized.

## Combined reports and dashboard

The **Reports** page provides daily, Monday-to-Sunday weekly, and monthly views while reading every
amount from its original source ledger:

- Service, tire, and canteen sales remain separate and are also combined into a total.
- A daily summary lists every calendar day in the selected period, including zero-activity days.
- Separate transaction tabs show the individual service, tire, and canteen sale records. Voided
  records remain visible for audit but are excluded from totals.
- Estimated gross profit subtracts tire and canteen sold-item cost snapshots plus outside-contractor
  labor. Estimated net then subtracts active operating expenses, including finalized payroll.
- Cash movement subtracts stock purchases, expenses, and outside-contractor labor from collected
  sales. Inventory purchases are not also subtracted from estimated net because sold-item cost is
  already represented there.
- The Dashboard now displays live service, tire, canteen, and combined totals for the current day.

Report queries support at most 366 days at a time and require an authenticated local session.

## Attendance and Period Close

The **Attendance** page shows daily presence, meals, calculated salary, optional owner salary
adjustments, review state, paid history, and running unpaid totals. Salary-affecting changes clear
the day's review automatically.

The **Period Close** page finalizes any owner-selected range from 1 to 31 days. Every active
workforce date must be reviewed first. Closing snapshots daily finance and employee pay, creates
salary and meal expenses on their original business dates, and locks all dated records in the
range. Reopening unlocks the whole period, voids those generated expenses, and clears its reviews.
Legacy payroll and Daily Close history remains available and continues to lock active legacy dates.

## Equipment condition register

The **Equipment** page tracks reusable assets such as towels, hoses, machines, and cleaning tools.
Batch entry generates a separate editable asset code for every physical item. The owner can filter
by category and current condition, edit equipment, record repairs, and delete or restore records
through audited archive workflows.

Equipment purchases create one protected expense for the full batch. Repair costs create protected
repair expenses. Corrections remain synchronized with their source workflow, appear exactly once in
expenses, reports, and Period Close, and are locked when their business date has been closed.

## Public-repository safety

This repository contains source code only. Never commit real customer information, passwords,
recovery codes, `.env` files, SQLite databases, backups, logs, or the owner's Excel workbook.
Those files are blocked by `.gitignore`, but every commit must still be reviewed before it is
pushed.

## License

No open-source license has been granted. The repository is publicly visible, but the code
remains copyrighted by its owner unless a license is added later.
