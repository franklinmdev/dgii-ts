/**
 * Error base para todas las operaciones DGII.
 */
export class DgiiError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DgiiError';
    this.code = code;
  }
}

/**
 * Error de conexión: timeout, DNS, red caída, TLS.
 */
export class DgiiConnectionError extends DgiiError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'DGII_CONNECTION_ERROR', options);
    this.name = 'DgiiConnectionError';
  }
}

/**
 * RNC/cédula o NCF no encontrado en el registro de la DGII.
 * Esto NO es un error de infraestructura -- es un resultado
 * válido de negocio.
 */
export class DgiiNotFoundError extends DgiiError {
  constructor(message: string) {
    super(message, 'DGII_NOT_FOUND');
    this.name = 'DgiiNotFoundError';
  }
}

/**
 * Error del servicio: SOAP fault, HTTP 403/5xx, respuesta
 * inesperada.
 */
export class DgiiServiceError extends DgiiError {
  readonly statusCode?: number;

  constructor(
    message: string,
    options?: ErrorOptions & { statusCode?: number },
  ) {
    super(message, 'DGII_SERVICE_ERROR', options);
    this.name = 'DgiiServiceError';
    this.statusCode = options?.statusCode;
  }
}

/**
 * Todas las estrategias de consulta fallaron.
 */
export class AllStrategiesFailedError extends DgiiError {
  readonly errors: ReadonlyArray<Error>;

  constructor(message: string, errors: ReadonlyArray<Error>) {
    super(message, 'DGII_ALL_STRATEGIES_FAILED', {
      cause: errors[0],
    });
    this.name = 'AllStrategiesFailedError';
    this.errors = errors;
  }
}
