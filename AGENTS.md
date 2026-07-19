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
- Validate all data at the API boundary; never trust browser input.
- Snapshot transaction-critical names, prices, cost, and rule values for historical accuracy.
- Use effective-dated settings for payroll and pricing rules that change over time.
- Add tests for money, inventory, payroll, permissions, void/restore, and reporting behavior.
- Prefer small, reviewable commits and short-lived feature branches.
- Update documentation when commands, architecture, or business rules change.

## Completion standard

Before calling work complete, run `npm run check`, inspect `git diff`, and confirm no sensitive
or generated files are staged. Explain any verification that could not be performed.
