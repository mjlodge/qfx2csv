# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (host `::`, port `8080`)
- `npm run build` — production build; `npm run build:dev` builds in development mode
- `npm run lint` — ESLint over the whole project
- `npm run preview` — serve the production build locally

There is no test suite or test runner configured. `bun.lockb` and `package-lock.json` both exist; npm is the documented workflow.

## Architecture

A single-page, **fully client-side** React app (Vite + TypeScript + shadcn/ui + Tailwind) that converts Quicken/OFX brokerage files to CSV/XLSX. No backend — all parsing and file generation happen in the browser, and no data leaves the client. It is deployed via Lovable, and commits are often authored by the Lovable editor.

The entire application surface is two files:

- **`src/lib/qfxParser.ts`** — the core logic, framework-agnostic. `parseQFX(content)` turns raw QFX/OFX text into a `ParseResult`, and `transactionsToCSV(transactions)` serializes to CSV. The parser is **regex-based, not a real XML/SGML parser**: OFX files frequently omit closing tags, so `extractTagValue` matches `<TAG>value` (stops at the next `<` or newline) and `extractBlock` falls back to open-ended block matching when no closing tag is present. There is a 10MB input cap (`MAX_CONTENT_LENGTH`) guarding against ReDoS.

- **`src/pages/Index.tsx`** — the whole UI and all interaction state. Handles file selection, date-range filtering, summary stats, and XLSX export (via `exceljs`, built inline here rather than in the parser). CSV download is plain `Blob` + object URL.

`src/App.tsx` wires up routing (only `/` and a `*` NotFound), React Query, and toasters, but the app has just one real page.

### Parser data model & conventions

- Securities are resolved by a `Map<uniqueId, SecurityInfo>` built from the `SECLIST` block first, then transactions look up name/ticker by their `UNIQUEID` (CUSIP), falling back to inline `SECNAME`/`TICKER`. When adding transaction handling, follow this same lookup pattern (`getSecurityName`/`getSecurityTicker`).
- Transaction kinds parsed: `BUYSTOCK`/`BUYMF`, `SELLSTOCK`/`SELLMF`, `INCOME`, `REINVEST`, `INVBANKTRAN`. Bank-statement `STMTTRN` is parsed **only as a fallback** when no investment transactions were found.
- A transaction is kept only if it has a `date` or `fitid`. Dates are normalized from OFX `YYYYMMDDHHMMSS` to `YYYY-MM-DD` and the list is sorted ascending by date.
- The UI classifies rows by `type` into "trades" (`buyTypes`) vs "dividends" (`dividendTypes`) for separate tables and separate CSV/XLSX downloads. If you add a new transaction `type`, also add it to these arrays in `Index.tsx` or it will be parsed but hidden.

### UI components & styling

- `src/components/ui/` is the standard shadcn/ui component library (generated; avoid hand-editing). App-specific components are `FileDropZone`, `TransactionTable`, `NavLink`.
- Path alias `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig`).
- Styling is Tailwind with custom design tokens; classes like `glass` and `gradient-text` are project utilities defined in `src/index.css`.
- TypeScript is configured loosely (`strictNullChecks: false`, `noImplicitAny: false`, unused checks off) — don't assume strict-mode guarantees.
