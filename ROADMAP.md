# DD Auto Spa System Roadmap

This roadmap records the completed development history and the approved work that remains. A phase
is complete only after its implementation is merged into `main` and `npm run check` passes.

## Phase 1 - Project foundation (complete)

- Established the npm workspace, React/Vite SPA, Express server, Tailwind styling, and shared
  contracts package.
- Added the feature-based repository structure, local development and production commands, code
  quality checks, GitHub Actions, repository safety rules, and contributor working agreement.
- Kept databases, backups, credentials, real business data, and the source workbook outside Git.

## Phase 2 - Local database and owner authentication (complete)

- Added ordered SQLite migrations and storage under Windows Local AppData.
- Added first-time owner setup, username/password login, logout, secure sessions, CSRF protection,
  rate limiting, password recovery, and authentication audit events.
- Protected the SPA so only the authenticated owner can access business data and mutations.

## Phase 3 - Business catalogs and pricing (complete)

- Added owner-managed employees, vehicle classes, services, and the service-price matrix.
- Added ordinary, specialist, and external-contractor labor policies and effective business rules.
- Added audited edit, archive, and restore workflows while preserving historical references.

## Phase 4 - Service sales, attendance, and labor calculations (complete)

- Added multi-service vehicle tickets, daily transaction history, editing, voiding, and restoring.
- Added per-service employee assignments, automatic attendance, meal deductions, labor allocation,
  the specialist workflow, external Painting contractors, and Orlan's fixed-rate top-up rule.
- Snapshotted transaction-critical names, prices, policies, rates, contractors, and worker shares.

## Phase 5 - Tire sales and inventory (complete)

- Added tire products, optional beginning inventory, purchases, sales, and signed adjustments.
- Added daily, weekly, and monthly tire summaries, inventory valuation, estimated gross profit, and
  low-stock warnings.
- Enforced non-negative historical stock with audited product archive/restore and document
  edit/void/restore workflows.

## Phase 6 - Canteen sales and inventory (complete)

- Added drinks, snacks, and other canteen products with optional beginning inventory.
- Added canteen purchases, sales, adjustments, period summaries, stock valuation, and low-stock
  warnings while keeping canteen revenue separate from service and tire revenue.
- Enforced non-negative historical stock and preserved audited product and document history.

## Phase 7 - Purchases and expenses (complete)

- Added combined, tire-only, and canteen-only purchase reporting using inventory ledgers as the
  source of truth.
- Added owner-managed expense categories and general expense create, edit, void, and restore
  workflows.
- Added daily, weekly, and monthly totals, category breakdowns, protected automatic-expense source
  types, and audit history.

## Phase 8 - Payroll closing (complete)

- Added payroll previews using attendance, labor shares, fixed-rate top-ups, and meal deductions.
- Added owner-only payroll closing and reopening with immutable employee snapshots and date locks.
- Added protected Salary and Staff Meal expenses that remain synchronized with payroll runs.

## Phase 9 - Combined reports and live dashboard (complete)

- Added daily, Monday-to-Sunday weekly, and monthly reports for service, tire, and canteen sales,
  both separately and combined.
- Added daily summaries, individual source transactions, estimated gross profit, operating
  expenses, estimated net, purchases, direct costs, and cash movement.
- Replaced placeholder Dashboard sales amounts with live current-day ledger totals.

## Phase 10 - Attendance, payroll, and Daily Close (complete)

### Dedicated attendance and payroll page

- Replace the sidebar placeholder with a dedicated interface using the existing attendance,
  service-labor, and payroll-closing engine.
- Show daily employee attendance, adjustable meal deductions, job labor, fixed-rate top-ups, total
  pay, payroll state, and historical payroll runs.
- Keep closing, reopening, correction locks, protected generated expenses, and audit behavior
  consistent with the existing payroll workflow.

### Daily Close

- Replace the sidebar placeholder with an owner-only daily reconciliation workflow.
- Combine service, tire, and canteen sales with purchases, expenses, payroll, meals, contractor
  labor, and expected cash without duplicating ledger entries.
- Snapshot a finalized day's totals, preserve close/reopen history, require reasons for reopening,
  and block changes that would make closed totals drift until the date is reopened.

## Phase 11 - Equipment condition and expenses (planned)

### Equipment records

- Add an **Equipment** sidebar page after Canteen for towels, hoses, machines, cleaning tools, and
  other reusable assets.
- Track every physical item individually. Batch entry creates multiple separate records, such as
  twenty numbered towel records, from one form submission.
- Generate unique, owner-editable asset codes such as `TOWEL-001`.
- Store the category, name, asset code, description, purchase date, unit cost in centavos, current
  condition, condition-check date, and notes.
- Use fixed active conditions: **Good**, **Needs Attention**, **Under Repair**, and **Damaged**.
  Retirement uses archive/restore rather than a separate condition.
- Provide search, category and condition filters, status summaries, editing, and owner-authorized
  archive/restore. User-facing deletion remains an audited archive operation, never a hard delete.

### Categories and financial integration

- Seed Towels, Hoses, Machines, Cleaning Tools, and Other; allow the owner to add, rename, archive,
  and restore categories.
- Create one protected Equipment Purchase expense when a priced batch is added, calculated as
  quantity multiplied by unit cost.
- Allow a repair cost to be recorded for an item, create a protected Equipment Repair expense, and
  update the item's resulting current condition.
- Synchronize purchase or repair corrections with their linked expense. Archiving equipment must
  never remove or void historical money already spent.
- Include generated equipment expenses automatically in Purchases & Expenses, combined reports,
  and Daily Close exactly once.

### Phase 11 boundaries

- Keep current condition only; do not add an inspection timeline or scheduled-maintenance system.
- Do not add photos, barcode scanning, CSV import, or consumable-stock deduction.
- Protect every mutation with owner authentication, CSRF validation, API-boundary validation,
  database transactions, audit events, and reason-required archive/restore or void/restore.

## Completion requirements for future phases

- Add ordered immutable SQLite migrations and feature modules that follow the existing controller,
  service, repository, and validation boundaries.
- Add tests for calculations, permissions, audit behavior, historical preservation, generated
  expenses, close/reopen behavior, and responsive user workflows.
- Run `npm run check`, inspect `git diff`, and confirm that no database, credentials, real customer
  data, backups, generated files, or source workbook are staged before publishing.
