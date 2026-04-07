export const DGII_RNC_URL =
  'https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx';

export const DGII_NCF_URL =
  'https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/ncf.aspx';

export const FORM_FIELDS = /*#__PURE__*/ Object.freeze({
  viewState: '__VIEWSTATE',
  viewStateGenerator: '__VIEWSTATEGENERATOR',
  eventValidation: '__EVENTVALIDATION',
  rncInput: 'ctl00$cphMain$txtRNCCedula',
  rncSubmit: 'ctl00$cphMain$btnBuscarPorRNC',
  ncfRncInput: 'ctl00$cphMain$txtRNC',
  ncfInput: 'ctl00$cphMain$txtNCF',
  ncfSubmit: 'ctl00$cphMain$btnConsultar',
} as const);
