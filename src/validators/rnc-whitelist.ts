/**
 * RNCs conocidos que no pasan el algoritmo mod-11 pero son válidos
 * según datos reales de la DGII. Fuente: python-stdnum.
 */
export const RNC_WHITELIST: ReadonlySet<string> = /*#__PURE__*/ new Set([
  '101581601', '101582245', '101595422', '101595785', '10233317',
  '131188691', '401007374', '501341601', '501378067', '501620371',
  '501651319', '501651823', '501651845', '501651926', '501656006',
  '501658167', '501670785', '501676936', '501680158', '504654542',
  '504680029', '504681442', '505038691',
]);
