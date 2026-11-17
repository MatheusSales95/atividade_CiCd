import { beforeEach, describe, expect, it } from 'vitest';
import { MULTA_MAXIMA } from '../../src/domain/emprestimo';
import type { Emprestimo, Livro, NovoLivro } from '../../src/domain/tipos';
import { ErroDeAplicacao } from '../../src/http/errors';
import type { EmprestimoRepository, LivroRepository } from '../../src/repositories/tipos';
import { EmprestimoService } from '../../src/services/emprestimoService';
import { LivroService } from '../../src/services/livroService';

/** Repositorio em memoria: permite testar o servico sem banco. */
class LivroRepositorioFake implements LivroRepository {
  livros: Livro[] = [];
  private proximoId = 1;

  listar(): Promise<Livro[]> {
    return Promise.resolve([...this.livros]);
  }

  buscarPorId(id: number): Promise<Livro | null> {
    return Promise.resolve(this.livros.find((l) => l.id === id) ?? null);
  }

  buscarPorIsbn(isbn: string): Promise<Livro | null> {
    return Promise.resolve(this.livros.find((l) => l.isbn === isbn) ?? null);
  }

  inserir(livro: NovoLivro): Promise<Livro> {
    const novo: Livro = {
      id: this.proximoId++,
      ...livro,
      disponivel: true,
      criadoEm: new Date('2026-01-01T00:00:00Z'),
    };
    this.livros.push(novo);
    return Promise.resolve(novo);
  }
}

class EmprestimoRepositorioFake implements EmprestimoRepository {
  emprestimos: Emprestimo[] = [];
  private proximoId = 1;

  constructor(private readonly livros: LivroRepositorioFake) {}

  buscarPorId(id: number): Promise<Emprestimo | null> {
    return Promise.resolve(this.emprestimos.find((e) => e.id === id) ?? null);
  }

  contarAtivosDoMembro(membro: string): Promise<number> {
    return Promise.resolve(
      this.emprestimos.filter((e) => e.membro === membro && e.dataDevolucao === null)
        .length,
    );
  }

  abrir(entrada: {
    livroId: number;
    membro: string;
    dataEmprestimo: Date;
    dataPrevista: Date;
  }): Promise<Emprestimo> {
    const novo: Emprestimo = {
      id: this.proximoId++,
      livroId: entrada.livroId,
      membro: entrada.membro,
      dataEmprestimo: entrada.dataEmprestimo,
      dataPrevista: entrada.dataPrevista,
      dataDevolucao: null,
      multa: null,
    };
    this.emprestimos.push(novo);
    const livro = this.livros.livros.find((l) => l.id === entrada.livroId);
    if (livro) livro.disponivel = false;
    return Promise.resolve(novo);
  }

  fechar(entrada: {
    id: number;
    livroId: number;
    dataDevolucao: Date;
    multa: number;
  }): Promise<Emprestimo> {
    const emprestimo = this.emprestimos.find((e) => e.id === entrada.id);
    if (!emprestimo) throw new Error('emprestimo inexistente no fake');
    emprestimo.dataDevolucao = entrada.dataDevolucao;
    emprestimo.multa = entrada.multa.toFixed(2);
    const livro = this.livros.livros.find((l) => l.id === entrada.livroId);
    if (livro) livro.disponivel = true;
    return Promise.resolve(emprestimo);
  }
}

const ISBN_A = '9788533302273';
const ISBN_B = '9780306406157';

async function capturarErro(acao: () => Promise<unknown>): Promise<ErroDeAplicacao> {
  try {
    await acao();
  } catch (erro) {
    if (erro instanceof ErroDeAplicacao) return erro;
    throw erro;
  }
  throw new Error('esperava um ErroDeAplicacao, mas nada foi lancado');
}

describe('LivroService', () => {
  let repositorio: LivroRepositorioFake;
  let servico: LivroService;

  beforeEach(() => {
    repositorio = new LivroRepositorioFake();
    servico = new LivroService(repositorio);
  });

  it('cria livro normalizando o ISBN e aparando os textos', async () => {
    const livro = await servico.criar({
      titulo: '  Dom Casmurro  ',
      autor: '  Machado de Assis ',
      isbn: '978-85-333-0227-3',
    });

    expect(livro.titulo).toBe('Dom Casmurro');
    expect(livro.autor).toBe('Machado de Assis');
    expect(livro.isbn).toBe(ISBN_A);
    expect(livro.disponivel).toBe(true);
  });

  it('recusa ISBN com digito verificador invalido', async () => {
    const erro = await capturarErro(() =>
      servico.criar({ titulo: 'X', autor: 'Y', isbn: '9780306406158' }),
    );
    expect(erro.status).toBe(422);
    expect(erro.codigo).toBe('validacao');
  });

  it('recusa ISBN ja cadastrado', async () => {
    await servico.criar({ titulo: 'A', autor: 'B', isbn: ISBN_A });
    const erro = await capturarErro(() =>
      servico.criar({ titulo: 'C', autor: 'D', isbn: ISBN_A }),
    );
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('isbn_duplicado');
  });

  it('falha ao buscar livro inexistente', async () => {
    const erro = await capturarErro(() => servico.buscarPorId(999));
    expect(erro.status).toBe(404);
  });
});

describe('EmprestimoService', () => {
  let livrosRepo: LivroRepositorioFake;
  let emprestimosRepo: EmprestimoRepositorioFake;
  let livroService: LivroService;
  let relogio: Date;
  let servico: EmprestimoService;

  beforeEach(async () => {
    livrosRepo = new LivroRepositorioFake();
    emprestimosRepo = new EmprestimoRepositorioFake(livrosRepo);
    livroService = new LivroService(livrosRepo);
    relogio = new Date('2026-03-01T12:00:00Z');
    servico = new EmprestimoService(emprestimosRepo, livrosRepo, () => relogio);

    await livroService.criar({ titulo: 'Livro A', autor: 'Autor', isbn: ISBN_A });
    await livroService.criar({ titulo: 'Livro B', autor: 'Autor', isbn: ISBN_B });
  });

  it('empresta e calcula a data prevista a partir do emprestimo', async () => {
    const emprestimo = await servico.emprestar(1, 'ana');

    expect(emprestimo.livroId).toBe(1);
    expect(emprestimo.dataPrevista.toISOString()).toBe('2026-03-15T12:00:00.000Z');
    expect(emprestimo.dataDevolucao).toBeNull();
  });

  it('marca o livro como indisponivel ao emprestar', async () => {
    await servico.emprestar(1, 'ana');
    const livro = await livrosRepo.buscarPorId(1);
    expect(livro?.disponivel).toBe(false);
  });

  it('recusa emprestimo de livro ja emprestado', async () => {
    await servico.emprestar(1, 'ana');
    const erro = await capturarErro(() => servico.emprestar(1, 'bruno'));
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('livro_indisponivel');
  });

  it('recusa emprestimo de livro inexistente', async () => {
    const erro = await capturarErro(() => servico.emprestar(404, 'ana'));
    expect(erro.status).toBe(404);
  });

  it('bloqueia o membro que atingiu o limite de emprestimos ativos', async () => {
    for (const isbn of ['9788535902778', '9788575225639', '9788539004263']) {
      await livroService.criar({ titulo: 'L', autor: 'A', isbn });
    }
    await servico.emprestar(1, 'ana');
    await servico.emprestar(2, 'ana');
    await servico.emprestar(3, 'ana');

    const erro = await capturarErro(() => servico.emprestar(4, 'ana'));
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('limite_atingido');
  });

  it('devolve no prazo sem multa e libera o livro', async () => {
    const emprestimo = await servico.emprestar(1, 'ana');
    relogio = new Date('2026-03-15T09:00:00Z');

    const devolvido = await servico.devolver(emprestimo.id);

    expect(devolvido.multa).toBe('0.00');
    expect((await livrosRepo.buscarPorId(1))?.disponivel).toBe(true);
  });

  it('cobra multa proporcional ao atraso', async () => {
    const emprestimo = await servico.emprestar(1, 'ana');
    relogio = new Date('2026-03-19T09:00:00Z');

    expect((await servico.devolver(emprestimo.id)).multa).toBe('6.00');
  });

  it('limita a multa ao teto em atrasos longos', async () => {
    const emprestimo = await servico.emprestar(1, 'ana');
    relogio = new Date('2026-06-19T09:00:00Z');

    expect((await servico.devolver(emprestimo.id)).multa).toBe(MULTA_MAXIMA.toFixed(2));
  });

  it('recusa devolucao repetida', async () => {
    const emprestimo = await servico.emprestar(1, 'ana');
    relogio = new Date('2026-03-10T09:00:00Z');
    await servico.devolver(emprestimo.id);

    const erro = await capturarErro(() => servico.devolver(emprestimo.id));
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe('ja_devolvido');
  });
});
