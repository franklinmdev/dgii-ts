# dgii-ts

[![npm version](https://img.shields.io/npm/v/dgii-ts.svg)](https://www.npmjs.com/package/dgii-ts)
[![CI](https://github.com/franklinmdev/dgii-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/franklinmdev/dgii-ts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)

Librería TypeScript para validación e integración con la DGII de
República Dominicana — RNC, cédula, NCF, e-NCF.

[🇺🇸 English](./README.en.md)

---

## ¿Por qué?

La Dirección General de Impuestos Internos (DGII) no ofrece un API REST
público para consultas básicas de RNC o NCF. Los desarrolladores dominicanos
dependen de scrapers frágiles que parsean páginas ASP.NET con ViewState — y
esas páginas han cambiado de URL al menos tres veces, rompiendo cada integración
existente.

**dgii-ts** resuelve esto con un enfoque de cuatro capas diseñado para
resiliencia:

1. **Validación offline** — nunca falla, cero llamadas de red
2. **Web scraping** — consultas en tiempo real contra las páginas
   ASP.NET de la DGII
3. **Cliente SOAP** *(deprecated)* — wrapper del servicio WSMovilDGII,
   bloqueado por la DGII en enero 2025
4. **Datos masivos** — importación del archivo diario DGII\_RNC.zip

## Características

### Validación offline

Validación algorítmica de dígitos verificadores para RNC (9 dígitos), cédula
(11 dígitos), NCF (serie B) y e-NCF (serie E). Sin dependencias de red, sin
puntos de fallo externos. Incluye whitelists de 578 cédulas y 23 RNCs
(fuente: [python-stdnum](https://github.com/arthurdejong/python-stdnum)) que
pasan validación aunque no cumplan el algoritmo de dígito verificador.

### Cliente resiliente (DgiiClient)

`DgiiClient` es el punto de entrada recomendado para consultas en tiempo real.
Usa web scraping como estrategia primaria con fallback a SOAP, circuit breaker
para evitar cascadas de errores, y retry con backoff exponencial.

### Web scraping

Consulta las páginas ASP.NET de la DGII extrayendo tokens ViewState y
parseando el HTML de respuesta. Es la estrategia principal desde que la DGII
bloqueó el endpoint SOAP en enero 2025.

### Cliente SOAP (WSMovilDGII) — deprecated

Wrapper tipado alrededor del servicio SOAP de la DGII. **Bloqueado
permanentemente por la DGII en enero 2025.** Se mantiene como fallback
interno pero no se recomienda su uso directo.

### Importador de datos masivos

Descarga y parseo del archivo ZIP diario de contribuyentes que publica la DGII
(`DGII_RNC.zip`). Ideal para operaciones en lote y búsquedas locales rápidas.

## Instalación

```bash
npm install dgii-ts
```

```bash
pnpm add dgii-ts
```

```bash
yarn add dgii-ts
```

## Uso rápido

### Validar un RNC

```typescript
import { validateRnc } from 'dgii-ts';

const result = validateRnc('131098193');
// { valid: true, formatted: '1-31-09819-3' }
```

### Validar una cédula

```typescript
import { validateCedula } from 'dgii-ts';

const result = validateCedula('00114272360');
// { valid: true, formatted: '001-1427236-0' }
```

### Validar un NCF

```typescript
import { validateNcf } from 'dgii-ts';

const result = validateNcf('B0100000001');
// { valid: true, type: 'CREDITO_FISCAL', serie: 'B01' }
```

### Validar un e-NCF

```typescript
import { validateEcf } from 'dgii-ts';

const result = validateEcf('E310000000001');
// { valid: true, type: 'CREDITO_FISCAL_ELECTRONICA', serie: 'E31' }
```

### Importar solo validadores (tree-shaking)

```typescript
import { validateRnc } from 'dgii-ts/validators';
```

Los submódulos disponibles son `dgii-ts/validators`, `dgii-ts/client`,
`dgii-ts/scraping`, `dgii-ts/soap`, `dgii-ts/bulk` y `dgii-ts/errors`.

### Consultar contribuyente

```typescript
import { DgiiClient } from 'dgii-ts/client';

const client = new DgiiClient();
const result = await client.getContribuyente('131098193');
// { rnc: '131098193', nombre: '...', estado: '...', ... }
```

### Validar NCF en línea

```typescript
const ncfResult = await client.getNCF('131098193', 'B0100000001');
// { rnc: '131098193', ncf: 'B0100000001', estado: '...', ... }
```

## Referencia del API

### Validadores

| Función | Descripción |
| --- | --- |
| `validateRnc(value)` | Valida RNC de 9 dígitos con dígito verificador |
| `validateCedula(value)` | Valida cédula de 11 dígitos con dígito verificador |
| `validateNcf(value)` | Valida formato y tipo de NCF (serie B) |
| `validateEcf(value)` | Valida formato y tipo de e-NCF (serie E) |

### Cliente resiliente

| Clase/Método | Descripción |
| --- | --- |
| `DgiiClient` | Cliente con scraping + SOAP fallback, circuit breaker y retry |
| `client.getContribuyente(rnc)` | Consulta datos de un contribuyente por RNC |
| `client.getNCF(rnc, ncf)` | Valida un comprobante fiscal contra la DGII |

### Scraping

| Clase/Método | Descripción |
| --- | --- |
| `ScrapingClient` | Consulta páginas ASP.NET de la DGII |
| `client.getContribuyente(rnc)` | Consulta contribuyente por RNC |
| `client.getNCF(rnc, ncf)` | Valida comprobante fiscal |

### Cliente SOAP (deprecated)

| Clase/Método | Descripción |
| --- | --- |
| `DgiiSoapClient` | Cliente para WSMovilDGII (bloqueado) |
| `client.getContribuyente(rnc)` | Consulta contribuyente por RNC |
| `client.getNCF(rnc, ncf)` | Valida comprobante fiscal |

### Datos masivos

| Clase/Método | Descripción |
| --- | --- |
| `downloadBulkFile(options)` | Descarga DGII\_RNC.zip |
| `parseBulkFile(options)` | Parsea el archivo TXT |

## Arquitectura

```text
┌─────────────────────────────────────────────────┐
│                  Tu aplicación                  │
├─────────────────────────────────────────────────┤
│  Capa 1: Validación offline                     │
│  ✓ Check-digit RNC/Cédula  ✓ Formato NCF/e-NCF │
├─────────────────────────────────────────────────┤
│  Capa 2: DgiiClient (resiliente)                │
│  ✓ Web scraping (primario)                      │
│  ✓ SOAP fallback  ✓ Circuit breaker  ✓ Retry   │
├─────────────────────────────────────────────────┤
│  Capa 3: Datos masivos (DGII_RNC.zip)           │
│  ✓ Descarga diaria  ✓ Parseo TXT               │
└─────────────────────────────────────────────────┘
```

La **capa 1** es instantánea y funciona sin conexión. La **capa 2** ofrece
datos en tiempo real con web scraping como estrategia primaria, fallback a
SOAP, circuit breaker y retry con backoff exponencial. La **capa 3** es
ideal para operaciones en lote donde necesitas buscar miles de RNC rápidamente.

## Estado del proyecto

- [x] Validación offline (RNC, cédula, NCF, e-NCF)
- [x] Web scraping de las páginas ASP.NET de la DGII
- [x] Cliente SOAP WSMovilDGII (deprecated — bloqueado por la DGII)
- [x] Cliente resiliente con circuit breaker y retry
- [x] Importador DGII\_RNC.zip (descarga + parseo)
- [x] Publicado en npm

## Seguridad

Para reportar vulnerabilidades, consulta [SECURITY.md](./SECURITY.md).

## Contribuciones

Las contribuciones son bienvenidas. Consulta [CONTRIBUTING.md](./CONTRIBUTING.md)
para más detalles.

## Licencia

[MIT](./LICENSE)

## Nota

Esta es una librería comunitaria independiente, no está afiliada ni respaldada
por la DGII. Para datos fiscales críticos, verifica siempre con un profesional
contable autorizado.
