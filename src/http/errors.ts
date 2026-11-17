/** Erro de dominio que ja carrega o status HTTP correspondente. */
export class ErroDeAplicacao extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroDeAplicacao';
  }
}

export class ErroNaoEncontrado extends ErroDeAplicacao {
  constructor(mensagem: string) {
    super(404, 'nao_encontrado', mensagem);
  }
}

export class ErroDeConflito extends ErroDeAplicacao {
  constructor(codigo: string, mensagem: string) {
    super(409, codigo, mensagem);
  }
}

export class ErroDeValidacao extends ErroDeAplicacao {
  constructor(mensagem: string) {
    super(422, 'validacao', mensagem);
  }
}
