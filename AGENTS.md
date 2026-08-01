# DD Auto Spa Working Agreement

## Product boundaries

- This is a single-PC, offline-first business system served on `127.0.0.1`.
- Use JavaScript, not TypeScript.
- Keep business data, databases, backups, credentials, and the source Excel workbook out of Git.
- Treat money as integer centavos and percentages as integer basis points.
- Preserve audit history. Business records are voided/restored rather than hard-deleted.
- Existing transactions may be edited only after owner authorization.

## Repository layout

- `apps/web`: React and Tailwind user interface, organized by business feature.
- `apps/server`: Express API. Put feature code under `src/modules/<feature>`.
- `apps/server/src/db/migrations`: ordered, immutable SQLite schema migrations.
- `packages/contracts`: framework-neutral shared constants and validation contracts.
- Tests live beside the code they verify and use the `.test.js` or `.test.jsx` suffix.

## Commands

- Install: `npm install`
- Develop: `npm run dev`
- Verify everything: `npm run check`
- Test: `npm test`
- Production build: `npm run build`
- Production start: `npm start`

## Engineering conventions

- Keep route handlers thin; business calculations belong in services.
- Database access belongs in repositories and must use transactions for multi-step changes.
- Open SQLite through `src/db/database.js`; keep the default database in Windows Local AppData.
- Protect owner mutations with authentication, owner-role, and CSRF middleware.
- Validate all data at the API boundary; never trust browser input.
- Snapshot transaction-critical names, prices, cost, and rule values for historical accuracy.
- Use effective-dated settings for payroll and pricing rules that change over time.
- Add tests for money, inventory, payroll, permissions, void/restore, and reporting behavior.
- Prefer small, reviewable commits and short-lived feature branches.
- Update documentation when commands, architecture, or business rules change.

## Catalog rules

- Store employee fixed daily rates and service prices as integer centavos.
- Permit at most one active graphene/detailing specialist employee.
- Treat ordinary, specialist, and external-contractor labor rules as explicit service data, not
  name-based guesses.
- Keep archived employees, vehicle classes, and services available for historical references.
- Confirm catalog archive/restore actions and record an optional owner note in audit history.

## Service transaction and labor rules

- A vehicle ticket may contain multiple distinct service lines.
- Snapshot the vehicle class, service, sale amount, labor policy, labor rate, contractor details,
  assigned workers, and exact worker shares on every transaction.
- Divide ordinary-service labor only among the regular employees assigned to that service. Preserve
  exact centavos by allocating any remainder deterministically.
- Assign specialist-service labor to the single active specialist employee.
- Record Painting as external work with a manually entered contractor name and labor cost; do not
  create attendance or employee payroll for the outside painter.
- When Orlan is present, treat his configured fixed daily rate as a minimum. Add only a top-up when
  his calculated job labor is below the fixed rate; never add the full fixed rate on top of labor.
- Assigned regular employees are automatically present. The default meal deduction is 5,000
  centavos for each present employee and may be adjusted by the owner.
- Confirm service ticket void/restore actions, accept an optional note, and preserve their
  audit history.

## Canteen inventory rules

- Keep canteen sales separate from service and tire sales and exclude them from service labor.
- Classify products as drinks, snacks, or other and allow optional beginning inventory.
- Snapshot item name, category, unit cost, and selling price on every stock document.
- Reject create, edit, void, or restore actions that make stock negative on any business date.
- Confirm product archive/restore and document void/restore actions, accept an optional note, and
  voided/restored, and preserve audit history.

## Tire inventory rules

- Keep tire-product sales separate from Vulcanizing/Tire Change service transactions. Only a tire
  product sale reduces tire inventory.
- Derive stock from active immutable ledger documents: beginning inventory and purchases add stock,
  sales subtract stock, and adjustments use a signed quantity.
- Allow an optional note on stock adjustments.
- Snapshot the product name, category, tube type, size, quantity, cost, selling price, stock delta,
  and line total on every tire inventory document item.
- Reject any create, edit, void, or restore action that would produce negative end-of-day stock on
  any business date.
- Permit at most one active beginning-inventory entry per tire product.
- Use the product's current unit cost for current inventory valuation and snapshot that cost on a
  sale for estimated historical gross profit.
- Archive/restore tire products and void/restore inventory documents with confirmation and an optional note;
  never hard-delete them or their audit history.

## Purchase and expense rules

- Treat the tire and canteen inventory purchase documents as the purchase-report source of truth;
  never copy them into a second purchase ledger.
- Support combined, tire-only, and canteen-only purchase reporting for any date range.
- Store general-expense amounts as integer centavos and snapshot the category name on every expense.
- Keep expense categories owner-managed and available for historical references after archival.
- Reserve payroll and staff-meal source types for automatic workflows; manual expense endpoints
  must not modify system-generated expenses.
- Confirm expense category archive/restore and expense void/restore actions with an optional note;
  voided/restored, and preserve audit history.

## Equipment rules

- Track every reusable physical item individually; batch entry may generate multiple individually
  coded records.
- Use Good, Needs Attention, Under Repair, and Damaged as the fixed active conditions. Retirement
  uses confirmed archive/restore with an optional note.
- Keep equipment categories owner-managed and preserve archived categories for historical use.
- Treat equipment purchase batches and repairs as the source of truth for their protected generated
  expenses; manual expense endpoints must not modify them.
- Synchronize purchase and repair corrections with their linked expenses, and never remove past
  expenses merely because equipment is archived.
- Block dated purchase and repair cost changes after Period Close until the business date is
  reopened.

## Attendance and Period Close rules

- Daily final salary is the owner override when present, otherwise calculated salary.
- Salary-affecting edits clear the day's attendance review.
- Period Close accepts an inclusive owner-selected range of 1 to 31 non-future days.
- Every date with attendance, salary, or service activity must be reviewed before closing.
- Active Period Close ranges lock every dated business record in their range.
- Reopening applies to the whole period, voids its salary and meal expenses, and clears reviews.
- Keep legacy payroll and Daily Close tables immutable and continue honoring their date locks.

## Completion standard

Before calling work complete, run `npm run check`, inspect `git diff`, and confirm no sensitive
or generated files are staged. Explain any verification that could not be performed.
