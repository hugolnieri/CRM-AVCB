export interface LicencaBombeiros {
  bairro: string;
  complemento: string;
  endereco: string;
  municipio: string;
  numeroLicenca: string;
  ocupacao: string;
  situacao: string;
  tipoLicenca: string;
  siteReceipt: string;
}

export interface ConsultaBombeirosResult {
  ok: true;
  count: number;
  licencas: LicencaBombeiros[];
}

/** Resultado da última consulta à API, persistido no lead. */
export interface BombeirosConsulta {
  licencas: LicencaBombeiros[];
  consultadoEm: string;
}

export interface ConsultaBombeirosError {
  ok: false;
  error: string;
}
