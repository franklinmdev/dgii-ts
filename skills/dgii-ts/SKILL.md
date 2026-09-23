---
name: dgii-ts
description: Write correct TypeScript or JavaScript with the dgii-ts library for Dominican Republic tax data from the DGII (Dirección General de Impuestos Internos). Covers validating RNC and cédula numbers, checking NCF and e-NCF (e-CF) invoice numbers, looking up taxpayers (contribuyentes) live, verifying an e-NCF's status, and importing the DGII_RNC.zip taxpayer registry. Use this whenever code touches RNC, cédula, NCF, e-NCF, comprobantes fiscales, facturación electrónica, or Dominican tax IDs, even if the user never names dgii-ts, and before writing any mod-11 or Luhn check or any DGII scraper by hand.
---

# dgii-ts

dgii-ts validates Dominican tax identifiers offline and queries the DGII
online. Most mistakes with it come from three misunderstandings: treating
an offline `valid: true` as "DGII confirmed this", using the wrong entry
point for live queries, and handling errors in a way that either hides
real outages or hammers DGII's servers. This skill exists to prevent
those.

If the project does not depend on it yet: `npm install dgii-ts`
(Node 18 or later).

## Pick the entry point

| Need | Use | Network |
| --- | --- | --- |
| Is this RNC, cédula, NCF or e-NCF well formed? (forms, imports, and always before a live lookup) | `validateRnc`, `validateCedula`, `validateNcf`, `validateEcf` from `dgii-ts/validators` | none |
| Does DGII know this taxpayer, what is its name and status? Is this invoice number real? | one shared `DgiiClient` from `dgii-ts/client` | DGII web pages |
| Many RNCs at once, an offline copy of the registry, search by name | `downloadBulkFile` and `parseBulkFile` from `dgii-ts/bulk` | one ~23 MB download |

Three things the library also exports that you should not reach for:

- `DgiiSoapClient` (`dgii-ts/soap`) is deprecated. DGII shut the SOAP
  service off in January 2025 and it currently answers without data.
- `ScrapingClient` (`dgii-ts/scraping`) is the low-level layer that
  `DgiiClient` wraps. Used directly it has no retries and no circuit
  breaker.
- Hand-written check digits or regexes. DGII has real identifiers that
  fail the checksum; the validators carry a whitelist of them, so a
  hand-rolled mod-11 or Luhn rejects real taxpayers.

## Offline validators

```ts
import { validateRnc, validateCedula, validateNcf, validateEcf } from 'dgii-ts/validators';

validateRnc('131-09819-3');   // { valid: true, formatted: '1-31-09819-3' }
validateCedula('00114272360'); // { valid: true, formatted: '001-1427236-0' }
validateNcf('b0100000001');   // { valid: true, type: 'CREDITO_FISCAL', serie: 'B01' }
validateEcf('E310000000001'); // { valid: true, type: 'CREDITO_FISCAL_ELECTRONICA', serie: 'E31' }
validateRnc('131098194');     // { valid: false }
```

- **`valid: true` only means well formed.** It does not mean the RNC is
  registered or active, or that the NCF was ever issued or belongs to that
  issuer. Only `DgiiClient` can say that. Word UI messages accordingly
  ("invalid format" vs "not registered with DGII").
- RNC and cédula: every non-digit is stripped first, so dashes and spaces
  are fine. RNC is 9 digits (mod-11), cédula is 11 digits (Luhn).
  `formatted` is `X-XX-XXXXX-X` or `XXX-XXXXXXX-X`.
- NCF and e-NCF: only uppercased and trimmed; separators are **not**
  stripped, so `B01-00000001` is invalid. NCF is `B` + 2-digit type + 8
  digits (11 chars). e-NCF is `E` + 2-digit type + 10 digits (13 chars).
  Unknown type codes are invalid. Valid NCF types: 01, 02, 03, 04, 11,
  12, 13, 14, 15, 16, 17. Valid e-NCF types: 31, 32, 33, 34, 41, 43, 44,
  45, 46, 47. `NCF_TYPE_NAMES` and `ECF_TYPE_NAMES` (exported from the
  same subpath, keyed by the 2-digit code) give Spanish display names.
- Non-string input returns `{ valid: false }` and never throws, so the
  validators are safe on raw form data.
- The result is a discriminated union: check `valid` before reading
  `formatted`, `type` or `serie`.
- A Dominican taxpayer ID is either an RNC (companies, 9 digits) or a
  cédula (people, 11 digits). A field that accepts "RNC o cédula" should
  accept either validator's `valid: true`. `getContribuyente` accepts
  both.
- Store the digits (`value.replace(/\D/g, '')`) and use `formatted` for
  display.

## Live lookups with DgiiClient

Run it on the server. DGII's pages send no CORS headers, so a browser
cannot call them; use an API route, server action or backend job.

Create **one** client and reuse it:

```ts
// dgii.ts
import { DgiiClient } from 'dgii-ts/client';

export const dgii = new DgiiClient({ soapFallback: false });
```

Retry and circuit-breaker state live inside the instance. A new client per
request never trips its breaker, so during a DGII outage every request
keeps hitting DGII. `soapFallback` is `false` by default from dgii-ts
0.3.0; older versions default to `true`, so pass `false` explicitly. The
SOAP service is shut off: the fallback only adds a wasted request after
every failed lookup, and an empty SOAP reply would be reported as
`DgiiNotFoundError`, making an outage look like "not registered". Do not
turn it on.

Options and defaults: `timeout` 15000 ms (clamped to 1 to 120 s);
`retry: { maxRetries: 2, baseDelayMs: 500, maxDelayMs: 10000 }`
(exponential backoff with jitter); `circuitBreaker: { failureThreshold: 5,
recoveryTimeoutMs: 60000, successThreshold: 2 }`. Pass partial objects;
the rest keeps its default.

### Taxpayer: `getContribuyente(rncOrCedula)`

```ts
import type { Contribuyente } from 'dgii-ts';
import { DgiiNotFoundError } from 'dgii-ts/errors';

async function findTaxpayer(digits: string): Promise<Contribuyente | null> {
  try {
    return await dgii.getContribuyente(digits);
  } catch (err) {
    // Not registered with DGII: a normal answer, not an outage
    if (err instanceof DgiiNotFoundError) return null;
    throw err;
  }
}
```

A `Contribuyente` has `rnc` (digits only), `nombre`, `nombreComercial`,
`estado`, `categoria`, `esFacturadorElectronico`, and the optional
`actividadEconomica`, `regimenDePagos` and `administracionLocal`.

- `estado` is `'ACTIVO'` or `'INACTIVO'`. Every other DGII status
  (suspended, cancelled, and so on) is reported as `'INACTIVO'`.
- An unregistered RNC or cédula **throws** `DgiiNotFoundError`. It is not
  retried and does not count against the circuit breaker.
- Pass the digits you validated, not user input as typed.

### Invoice number: `getNCF(rncEmisor, ncf, options?)`

For a B-series NCF:

```ts
const r = await dgii.getNCF('131098193', 'B0100000001');
// found:     { valid: true, rnc, ncf, nombreComercial? }
// not found: { valid: false, rnc: '', ncf: '' } (other fields undefined)
```

Unlike `getContribuyente`, a missing or invalid NCF does **not** throw; it
returns `valid: false`.

For an e-NCF (E-series), DGII needs the buyer's RNC **and** the 6-character
security code printed on the invoice. The types mark both optional because
B-series lookups ignore them, but without either one DGII refuses to answer
and `DgiiClient` throws `AllStrategiesFailedError` whose message contains
DGII's "es necesario completar el campo..." text.

```ts
const e = await dgii.getNCF('101010632', 'E310125217173', {
  rncComprador: '131262414',
  codigoSeguridad: 'KrOLI0',
});
// { valid: true, rnc: '101010632', ncf: 'E310125217173',
//   rncComprador: '131262414', codigoSeguridad: 'KrOLI0',
//   estado: 'Aceptado', montoTotal: 230677.74, totalItbis: 35188.13,
//   fechaEmision: '2026-02-11', fechaFirma: '2026-02-11' }
```

- For an e-NCF, `valid: true` means DGII **found** it, not that it is
  accepted. Check `estado`.
- A wrong security code gives `valid: false`.
- `montoTotal` and `totalItbis` are numbers; `fechaEmision` and
  `fechaFirma` are strings exactly as DGII shows them.
- The library decides "e-NCF or not" with `validateEcf`, so run the
  offline validator first and only pass the options for an e-NCF.
- DGII also accepts a foreign ID in place of the buyer's RNC, but the
  library has no option for it.

## Errors

`DgiiClient` only ever throws two things:

| Error (`code`) | Meaning | What to do |
| --- | --- | --- |
| `DgiiNotFoundError` (`DGII_NOT_FOUND`) | `getContribuyente`: DGII has no such RNC or cédula | Tell the user it is not registered. Do not retry. |
| `AllStrategiesFailedError` (`DGII_ALL_STRATEGIES_FAILED`) | Everything else, after the built-in retries: network down, timeout, DGII HTTP error, circuit open, DGII page changed, missing e-NCF fields, empty input | Report "DGII is unavailable, try later" and log `err.errors` (one error per strategy tried; `err.cause` is the first). |

The underlying `DgiiConnectionError` (`DGII_CONNECTION_ERROR`) and
`DgiiServiceError` (`DGII_SERVICE_ERROR`, with optional `statusCode`) are
inside `err.errors`; they are only thrown directly by the low-level
clients. `BulkFormatError` (`DGII_BULK_FORMAT_ERROR`) comes from
`parseBulkFile`. All of them extend `DgiiError` and are exported from
`dgii-ts/errors` (and the root). Matching on `err.code` also works when
`instanceof` cannot, for example when an app loads the package both as
ESM and as CommonJS.

Do not wrap calls in your own retry loop. The client already retries
connection errors and HTTP 5xx with backoff, and deliberately does not
retry 4xx or unexpected pages, because repeating those will not help.

Because empty input and missing e-NCF fields also surface as
`AllStrategiesFailedError`, validate before calling. Otherwise a
programming error looks like a DGII outage.

## Be gentle with DGII

DGII publishes no rate limit and these are its public web pages. Each
lookup is two HTTP requests (load the form, submit it).

- Validate offline first. Never send DGII an identifier that fails the
  validator.
- Share one client (above).
- Cache results. Taxpayer names and statuses rarely change within a day.
- For batches, go one at a time or with very low concurrency. For more
  than a few dozen RNCs, use the bulk file instead of live lookups.
- Keep the default retry and circuit-breaker settings unless you have a
  measured reason; raising retries multiplies load during an outage.

## Bulk registry: DGII_RNC.zip

Node only (it uses `node:https` and `node:fs`).

The library downloads the ZIP but does not unzip it, and it has no zip
dependency. Extract the single entry `TMP/DGII_RNC.TXT` with the zip tool
the project already uses, or `adm-zip` (`npm install adm-zip`, plus
`@types/adm-zip` for TypeScript):

```ts
import { writeFile } from 'node:fs/promises';
import AdmZip from 'adm-zip';
import { downloadBulkFile, parseBulkFile } from 'dgii-ts/bulk';

const zipPath = await downloadBulkFile({ outputDir: '/var/data/dgii' });

const entry = new AdmZip(zipPath).getEntry('TMP/DGII_RNC.TXT');
if (!entry) throw new Error('DGII_RNC.zip no longer contains TMP/DGII_RNC.TXT');
const txtPath = '/var/data/dgii/DGII_RNC.TXT';
await writeFile(txtPath, entry.getData());

const rows = await parseBulkFile({ filePath: txtPath });
const byRnc = new Map(rows.map((row) => [row.rnc, row]));
```

- `downloadBulkFile` writes `<outputDir>/DGII_RNC.zip` (overwriting it) and
  returns that path, relative if `outputDir` was relative. `timeout`
  defaults to 60 s (clamped 5 s to 10 min). It rejects with a plain
  `Error`, not a `DgiiError`.
- The ZIP holds one file, `TMP/DGII_RNC.TXT`: about 90 MB, pipe-delimited,
  latin-1. The parser defaults to `latin1`; do not pass `utf8` or names
  like MUÑOZ get corrupted.
- `parseBulkFile` returns the whole registry as one array (about 790,000
  rows in September 2026, roughly 0.5 GB of memory at peak). Load it in a
  scheduled job and write it to a database or index; do not parse it per
  request.
- To check a list (suppliers, customers), validate each ID with
  `validateRnc` **or** `validateCedula` (people appear by cédula), report
  the ones that fail as bad format rather than "not registered", and look
  the rest up by their digits.
- Each row: `rnc` (bare digits: 9 for an RNC, 11 for a cédula), `nombre`,
  `nombreComercial`, `actividad` (DGII truncates it), `estado`, `regimen`,
  `fechaConstitucion` (`dd/mm/yyyy` or empty).
- Bulk `estado` is DGII's full vocabulary, `DGII_ESTADOS`: `ACTIVO`,
  `SUSPENDIDO`, `DADO DE BAJA`, `CESE TEMPORAL`, `ANULADO`, `RECHAZADO`.
  That is not comparable with `getContribuyente`'s `ACTIVO`/`INACTIVO`.
- Rows without exactly 11 columns are skipped. If most sampled rows have
  an unknown `estado`, it throws `BulkFormatError`: DGII changed the
  layout, so fail loudly rather than import garbage.

## Imports

| Subpath | Contents | Runs in |
| --- | --- | --- |
| `dgii-ts/validators` | the four validators, `NCF_TYPE_NAMES`, `ECF_TYPE_NAMES` | anywhere, including the browser |
| `dgii-ts/client` | `DgiiClient` | server (Node 18+) |
| `dgii-ts/errors` | the error classes | anywhere |
| `dgii-ts/bulk` | `downloadBulkFile`, `parseBulkFile`, `DGII_ESTADOS`, `DGII_BULK_URL` | Node |
| `dgii-ts` | everything above plus the low-level clients | server |

Types (`ValidationResult`, `NcfValidationResult`, `Contribuyente`,
`NcfQueryOptions`, `NcfQueryResult`, `BulkContribuyente`, `ClientOptions`)
are exported from the root. Both ESM `import` and CommonJS `require` work.
In client-side bundles import from `dgii-ts/validators` only.
