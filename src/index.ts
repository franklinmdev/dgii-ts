// Validadores offline
export {
  validateRnc,
  validateCedula,
  validateNcf,
  validateEcf,
  NCF_TYPE_NAMES,
  ECF_TYPE_NAMES,
} from './validators/index.js';

// Cliente SOAP
export { DgiiSoapClient, DGII_SOAP_BASE_URL, SOAP_ACTIONS } from './soap/index.js';

// Datos masivos
export { downloadBulkFile, parseBulkFile } from './bulk/index.js';

// Tipos
export type {
  ValidationResult,
  NcfValidationResult,
  Contribuyente,
  NcfQueryResult,
  BulkContribuyente,
} from './types/index.js';

export type { SoapClientOptions } from './soap/index.js';
export type { DownloadOptions, ParseOptions } from './bulk/index.js';
