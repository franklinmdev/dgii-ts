export {
  validateRnc,
  validateCedula,
  validateNcf,
  validateEcf,
  NCF_TYPE_NAMES,
  ECF_TYPE_NAMES,
} from './validators/index.js';

export { DgiiSoapClient, DGII_SOAP_BASE_URL, SOAP_ACTIONS } from './soap/index.js';

export {
  DgiiError,
  DgiiConnectionError,
  DgiiNotFoundError,
  DgiiServiceError,
  AllStrategiesFailedError,
} from './errors/index.js';

export { ScrapingClient, DGII_RNC_URL, DGII_NCF_URL } from './scraping/index.js';

export {
  DgiiClient,
  ConsecutiveBreaker,
  withRetry,
  isRetryableError,
} from './client/index.js';

export { downloadBulkFile, parseBulkFile } from './bulk/index.js';
export { DGII_BULK_URL } from './bulk/index.js';

export type {
  ValidationResult,
  NcfValidationResult,
  Contribuyente,
  NcfQueryResult,
  BulkContribuyente,
} from './types/index.js';

export type { SoapClientOptions } from './soap/index.js';
export type { ScrapingClientOptions } from './scraping/index.js';
export type { ClientOptions, RetryOptions, CircuitBreakerOptions } from './client/index.js';
export type { DownloadOptions, ParseOptions } from './bulk/index.js';
