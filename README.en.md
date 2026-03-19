# dgii-ts

[![npm version](https://img.shields.io/npm/v/dgii-ts.svg)](https://www.npmjs.com/package/dgii-ts)
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

**dgii-ts** solves this with a three-layer approach designed for resilience:

1. **Offline validation** — never fails, zero network calls
2. **SOAP client** — real-time queries against the WSMovilDGII service
3. **Bulk data** — import DGII's daily bulk RNC file (DGII\_RNC.zip)

## Features

### Offline validation

Algorithmic check-digit validation for RNC (9 digits), Cedula (11 digits),
NCF (B-series), and e-NCF (E-series). No network dependencies, no external
points of failure.

### SOAP client (WSMovilDGII)

Typed wrapper around DGII's SOAP service for taxpayer lookups
(`GetContribuyentes`) and fiscal receipt validation (`GetNCF`). Includes
full TypeScript types for all responses.

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

### Look up a taxpayer (SOAP)

```typescript
import { DgiiSoapClient } from 'dgii-ts';

const client = new DgiiSoapClient();
const result = await client.getContribuyente('131098193');
// { rnc: '131098193', nombre: '...', estado: '...', ... }
```

## API reference

### Validators

| Function | Description |
| --- | --- |
| `validateRnc(value)` | Validates a 9-digit RNC with check digit |
| `validateCedula(value)` | Validates an 11-digit Cedula with check digit |
| `validateNcf(value)` | Validates NCF format and type (B-series) |
| `validateEcf(value)` | Validates e-NCF format and type (E-series) |

### SOAP client

| Class/Method | Description |
| --- | --- |
| `DgiiSoapClient` | Typed client for WSMovilDGII |
| `client.getContribuyente(rnc)` | Looks up taxpayer data by RNC |
| `client.getNCF(rnc, ncf)` | Validates a fiscal receipt against DGII |

### Bulk data

| Class/Method | Description |
| --- | --- |
| `downloadBulkFile(path)` | Downloads DGII\_RNC.zip to the given directory |
| `parseBulkFile(path)` | Parses the taxpayer TXT file |

## Architecture

```text
┌─────────────────────────────────────────────────┐
│               Your application                  │
├─────────────────────────────────────────────────┤
│  Layer 1: Offline validation                    │
│  ✓ RNC/Cedula check-digit  ✓ NCF/e-NCF format  │
├─────────────────────────────────────────────────┤
│  Layer 2: SOAP client (WSMovilDGII)             │
│  ✓ Taxpayer lookup  ✓ NCF validation            │
├─────────────────────────────────────────────────┤
│  Layer 3: Bulk data (DGII_RNC.zip)              │
│  ✓ Daily download  ✓ TXT parsing                │
└─────────────────────────────────────────────────┘
```

**Layer 1** is instant and works offline. **Layer 2** provides real-time data
for recently registered taxpayers. **Layer 3** is ideal for batch operations
where you need to look up thousands of RNCs quickly.

## Project status

- [x] Offline validation (RNC, Cedula, NCF, e-NCF)
- [ ] SOAP client (WSMovilDGII)
- [ ] Bulk data importer (DGII\_RNC.zip)
- [ ] CLI tool

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE)

## Disclaimer

This is an independent community library, not affiliated with or endorsed by
DGII. For critical tax data, always verify with a licensed tax professional.
