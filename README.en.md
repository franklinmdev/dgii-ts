# dgii-ts

[![npm version](https://img.shields.io/npm/v/dgii-ts.svg)](https://www.npmjs.com/package/dgii-ts)
[![CI](https://github.com/franklinmdev/dgii-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/franklinmdev/dgii-ts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

TypeScript library for validation and integration with the Dominican Republic's
tax authority (DGII) — RNC, Cedula, NCF, e-NCF.

[🇩🇴 Español](./README.md)

---

## Why?

The Dominican Republic's tax authority (DGII) offers no public REST API for
basic RNC or NCF lookups. Dominican developers rely on fragile scrapers that
parse ASP.NET WebForms pages with ViewState — and those pages have changed URLs
at least three times, breaking every existing integration.

**dgii-ts** solves this with a four-layer approach designed for resilience:

1. **Offline validation** — never fails, zero network calls
2. **Web scraping** — real-time queries against DGII's ASP.NET pages
3. **SOAP client** *(deprecated)* — WSMovilDGII wrapper, blocked by
   DGII since January 2025
4. **Bulk data** — import DGII's daily bulk RNC file (DGII\_RNC.zip)

## Features

### Offline validation

Algorithmic check-digit validation for RNC (9 digits), Cedula (11 digits),
NCF (B-series), and e-NCF (E-series). No network dependencies, no external
points of failure. Includes whitelists of 578 Cedulas and 23 RNCs
(source: [python-stdnum](https://github.com/arthurdejong/python-stdnum))
that pass validation despite failing the check-digit algorithm.

### Resilient client (DgiiClient)

`DgiiClient` is the recommended entry point for real-time queries. It uses
web scraping as its primary strategy with SOAP fallback, a circuit breaker
to prevent cascading failures, and retry with exponential backoff.

### Web scraping

Queries DGII's ASP.NET pages by extracting ViewState tokens and parsing
response HTML. This is the primary strategy since DGII blocked the SOAP
endpoint in January 2025.

### SOAP client (WSMovilDGII) — deprecated

Typed wrapper around DGII's SOAP service. **Permanently blocked by DGII
since January 2025.** Kept as an internal fallback but not recommended
for direct use.

### Bulk data importer

Downloads and parses the daily taxpayer ZIP file published by DGII
(`DGII_RNC.zip`). Ideal for batch operations and fast local lookups.

## Installation

```bash
npm install dgii-ts
```

```bash
pnpm add dgii-ts
```

```bash
yarn add dgii-ts
```

## Quick start

### Validate an RNC

```typescript
import { validateRnc } from 'dgii-ts';

const result = validateRnc('131098193');
// { valid: true, formatted: '1-31-09819-3' }
```

### Validate a Cedula

```typescript
import { validateCedula } from 'dgii-ts';

const result = validateCedula('00114272360');
// { valid: true, formatted: '001-1427236-0' }
```

### Validate an NCF

```typescript
import { validateNcf } from 'dgii-ts';

const result = validateNcf('B0100000001');
// { valid: true, type: 'CREDITO_FISCAL', serie: 'B01' }
```

### Validate an e-NCF

```typescript
import { validateEcf } from 'dgii-ts';

const result = validateEcf('E310000000001');
// { valid: true, type: 'CREDITO_FISCAL_ELECTRONICA', serie: 'E31' }
```

### Import only validators (tree-shaking)

```typescript
import { validateRnc } from 'dgii-ts/validators';
```

Available submodules: `dgii-ts/validators`, `dgii-ts/client`,
`dgii-ts/scraping`, `dgii-ts/soap`, `dgii-ts/bulk`, and `dgii-ts/errors`.

### Look up a taxpayer

```typescript
import { DgiiClient } from 'dgii-ts/client';

const client = new DgiiClient();
const result = await client.getContribuyente('131098193');
// { rnc: '131098193', nombre: '...', estado: '...', ... }
```

### Validate an NCF online

```typescript
const ncfResult = await client.getNCF('131098193', 'B0100000001');
// { rnc: '131098193', ncf: 'B0100000001', estado: '...', ... }
```

## API reference

### Validators

| Function | Description |
| --- | --- |
| `validateRnc(value)` | Validates a 9-digit RNC with check digit |
| `validateCedula(value)` | Validates an 11-digit Cedula with check digit |
| `validateNcf(value)` | Validates NCF format and type (B-series) |
| `validateEcf(value)` | Validates e-NCF format and type (E-series) |

### Resilient client

| Class/Method | Description |
| --- | --- |
| `DgiiClient` | Scraping + SOAP fallback, circuit breaker, retry |
| `client.getContribuyente(rnc)` | Looks up taxpayer data by RNC |
| `client.getNCF(rnc, ncf)` | Validates a fiscal receipt against DGII |

### Scraping

| Class/Method | Description |
| --- | --- |
| `ScrapingClient` | Queries DGII's ASP.NET pages |
| `client.getContribuyente(rnc)` | Looks up taxpayer data by RNC |
| `client.getNCF(rnc, ncf)` | Validates a fiscal receipt |

### SOAP client (deprecated)

| Class/Method | Description |
| --- | --- |
| `DgiiSoapClient` | WSMovilDGII client (blocked) |
| `client.getContribuyente(rnc)` | Looks up taxpayer data by RNC |
| `client.getNCF(rnc, ncf)` | Validates a fiscal receipt |

### Bulk data

| Class/Method | Description |
| --- | --- |
| `downloadBulkFile(options)` | Downloads DGII\_RNC.zip to the given directory |
| `parseBulkFile(options)` | Parses the taxpayer TXT file |

## Architecture

```text
┌─────────────────────────────────────────────────┐
│               Your application                  │
├─────────────────────────────────────────────────┤
│  Layer 1: Offline validation                    │
│  ✓ RNC/Cedula check-digit  ✓ NCF/e-NCF format  │
├─────────────────────────────────────────────────┤
│  Layer 2: DgiiClient (resilient)                │
│  ✓ Web scraping (primary)                       │
│  ✓ SOAP fallback  ✓ Circuit breaker  ✓ Retry   │
├─────────────────────────────────────────────────┤
│  Layer 3: Bulk data (DGII_RNC.zip)              │
│  ✓ Daily download  ✓ TXT parsing                │
└─────────────────────────────────────────────────┘
```

**Layer 1** is instant and works offline. **Layer 2** provides real-time data
using web scraping as the primary strategy, with SOAP fallback, circuit
breaker, and retry with exponential backoff. **Layer 3** is ideal for batch
operations where you need to look up thousands of RNCs quickly.

## Project status

- [x] Offline validation (RNC, Cedula, NCF, e-NCF)
- [x] Web scraping of DGII's ASP.NET pages
- [x] SOAP client WSMovilDGII (deprecated — blocked by DGII)
- [x] Resilient client with circuit breaker and retry
- [x] Bulk data importer (download + parsing)
- [x] Published on npm

## Security

To report vulnerabilities, see [SECURITY.md](./SECURITY.md).

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE)

## Disclaimer

This is an independent community library, not affiliated with or endorsed by
DGII. For critical tax data, always verify with a licensed tax professional.
