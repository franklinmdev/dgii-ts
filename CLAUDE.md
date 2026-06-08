# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## Project overview

dgii-ts is a TypeScript library for validating Dominican Republic tax
identifiers and integrating with the DGII (Dirección General de
Impuestos Internos). It provides offline validators for RNC, cédula,
NCF, and e-NCF; a resilient client (web scraping with SOAP fallback,
circuit breaker, retry); a deprecated SOAP client; and a bulk
DGII_RNC.zip downloader/parser.

## Commands

```bash
npm run build        # Build with tsup (ESM + CJS dual output)
npm test             # Run all tests (vitest, single run)
npm run test:watch   # Watch mode
npm run typecheck    # Strict TypeScript type checking
# Run a single test file:
npx vitest run tests/validators/rnc.test.ts
# Coverage report (90% threshold enforced):
npx vitest run --coverage
```

## Architecture

The library has seven subpath exports (`./`, `./validators`,
`./client`, `./scraping`, `./soap`, `./bulk`, `./errors`) built via
tsup with code splitting. `src/index.ts` re-exports everything.

- **`src/validators/`** — Pure offline validators, no network calls.
  Each validator returns a typed result (`ValidationResult` or
  `NcfValidationResult`). RNC uses mod-11 checksum with weights
  `[7,9,8,6,5,4,3,2]`. Cédula uses Luhn. NCF (series B) and e-NCF
  (series E) are format-only checks with known type code mappings.
  Whitelists in `rnc-whitelist.ts` and `cedula-whitelist.ts` bypass
  algorithmic checks for known-valid identifiers.
- **`src/client/`** — `DgiiClient`, the recommended entry point for
  live queries. Runs scraping as the primary strategy with SOAP
  fallback, wrapped in a consecutive-failure circuit breaker
  (`circuit-breaker.ts`) and exponential-backoff retry (`retry.ts`).
- **`src/scraping/`** — `ScrapingClient` for DGII's ASP.NET WebForms
  pages: extracts ViewState tokens (`endpoints.ts`, `FORM_FIELDS`) and
  parses response HTML (`html-parser.ts`). Primary live strategy since
  DGII blocked the SOAP endpoint in January 2025.
- **`src/soap/`** — `DgiiSoapClient` for the WSMovilDGII SOAP service
  (hand-rolled envelopes in `envelopes.ts`, XML parsing in `xml.ts`).
  Deprecated: DGII blocked this endpoint in January 2025; kept only as
  the client's internal fallback.
- **`src/bulk/`** — Downloads (`downloader.ts`) and parses
  (`parser.ts`) DGII's daily `DGII_RNC.zip`. The parser maps a fixed
  11-column layout via a named COLUMN index table and throws
  `BulkFormatError` on column-count or `estado` drift. Accepts an
  `encoding` option (`latin1` default).
- **`src/errors/`** — `DgiiError` base plus `DgiiConnectionError`,
  `DgiiNotFoundError`, `DgiiServiceError`, `AllStrategiesFailedError`,
  and `BulkFormatError`, each with a stable `code`.
- **`src/types/`** — Shared interfaces (`ValidationResult`,
  `NcfValidationResult`, `Contribuyente`, etc.).
- **`src/utils/`** — `stripNonDigits()` and `collapseSpaces()` string
  helpers.

## Code conventions

- Strict TypeScript — no `any`, `noUncheckedIndexedAccess` enabled
- 2-space indentation, single quotes, semicolons (EditorConfig enforced)
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- Exported constants use `Object.freeze()` and `/*#__PURE__*/`
  annotations for tree-shaking
- All public validators include runtime type guards (reject non-string
  inputs)
- `sideEffects: false` in package.json — keep it that way

## Testing

Vitest with v8 coverage. Tests live in `tests/` mirroring `src/`
structure. Coverage thresholds: 90% branches, functions, and lines.
Entry/re-export files are excluded from coverage.
