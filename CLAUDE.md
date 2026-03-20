# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working
with code in this repository.

## Project overview

dgii-ts is a TypeScript library for validating Dominican Republic tax
identifiers and integrating with the DGII (Dirección General de
Impuestos Internos). It provides offline validators for RNC, cédula,
NCF, and e-NCF, plus stubs for a SOAP client and bulk file operations.

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

The library has four subpath exports (`./`, `./validators`, `./soap`,
`./bulk`) built via tsup with code splitting. `src/index.ts` re-exports
everything.

- **`src/validators/`** — Pure offline validators, no network calls.
  Each validator returns a typed result (`ValidationResult` or
  `NcfValidationResult`). RNC uses mod-11 checksum with weights
  `[7,9,8,6,5,4,3,2]`. Cédula uses Luhn. NCF (series B) and e-NCF
  (series E) are format-only checks with known type code mappings.
  Whitelists in `rnc-whitelist.ts` and `cedula-whitelist.ts` bypass
  algorithmic checks for known-valid identifiers.
- **`src/soap/`** — SOAP client skeleton for DGII's WSMovilDGII
  service. Currently stub implementations that throw "Not implemented".
- **`src/bulk/`** — Bulk file download/parse skeleton. Currently stubs.
- **`src/types/`** — Shared interfaces (`ValidationResult`,
  `NcfValidationResult`, `Contribuyente`, etc.).
- **`src/utils/`** — `stripNonDigits()` helper used by validators.

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
