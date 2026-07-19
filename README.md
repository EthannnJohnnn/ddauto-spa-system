# DD Auto Spa System

An offline-first local management system for DD Auto Spa. It will replace the owner's
spreadsheet workflow for service sales, tire inventory, canteen inventory, purchases,
expenses, attendance, payroll, daily closing, and reports.

Phase 1 contains the development foundation only. Business features and real business data
are intentionally not included yet.

## Technology

- React and Vite for the browser interface
- Tailwind CSS for styling
- Node.js and Express for the local API
- SQLite (introduced in Phase 2) for local storage
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

## Repository structure

```text
ddauto-spa-system/
|-- apps/
|   |-- server/              Express API and future SQLite access
|   `-- web/                 React user interface
|-- packages/
|   `-- contracts/           Shared constants and validation contracts
|-- .github/workflows/       Automated repository checks
|-- AGENTS.md                Working agreement for Codex and contributors
`-- package.json             Workspace commands and shared tooling
```

The server will use feature modules with route, controller, service, repository, and schema
layers where those layers provide real value. This keeps the application understandable
without forcing every small feature into unnecessary files.

## Public-repository safety

This repository contains source code only. Never commit real customer information, passwords,
recovery codes, `.env` files, SQLite databases, backups, logs, or the owner's Excel workbook.
Those files are blocked by `.gitignore`, but every commit must still be reviewed before it is
pushed.

## License

No open-source license has been granted. The repository is publicly visible, but the code
remains copyrighted by its owner unless a license is added later.
