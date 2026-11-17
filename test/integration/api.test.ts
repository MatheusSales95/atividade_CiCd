import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type Contexto,
  type EmprestimoResposta,
  type ErroResposta,
  ISBNS,
  type LivroResposta,
  encerrarContexto,
  getJson,
  limparTabelas,
  postJson,
  prepararContexto,
} from './ajuda';

let ctx: Contexto;

const livroExemplo = {
  titulo: 'Dom Casmurro',
  autor: 'Machado de Assis',
  isbn: ISBNS[0],
};

function criarLivro(dados: Record<string, unknown> = livroExemplo) {
  return postJson<LivroResposta & ErroResposta>(ctx.app, '/livros', dados);
}

beforeAll(async () => {
  ctx = await prepararContexto();
});

beforeEach(async () => {
  await limparTabelas(ctx.pool);
  ctx.definirAgora(new Date('2026-03-01T12:00:00Z'));
});

afterAll(async () => {
  await encerrarContexto();
});

describe('infraestrutura', () => {
  it('responde ao healthcheck', async () => {
    const { status, corpo } = await getJson<{ status: string }>(ctx.app, '/health');
    expect(status).toBe(200);
    expect(corpo).toEqual({ status: 'ok' });
  });

  it('aplicou as migracoes criando as tabelas esperadas', async () => {
    const { rows } = await ctx.pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const tabelas = rows.map((r) => r.table_name);
    expect(tabelas).toContain('livros');
    expect(tabelas).toContain('emprestimos');
    expect(tabelas).toContain('schema_migrations');
  });

  it('devolve 404 em rota inexistente', async () => {
    const { status } = await getJson<ErroResposta>(ctx.app, '/nao-existe');
    expect(status).toBe(404);
  });
});

describe('POST /livros', () => {
  it('persiste o livro e devolve 201', async () => {
    const { status, corpo } = await criarLivro();

    expect(status).toBe(201);
    expect(corpo.titulo).toBe('Dom Casmurro');
    expect(corpo.isbn).toBe(ISBNS[0]);
    expect(corpo.disponivel).toBe(true);

    const { rows } = await ctx.pool.query<{ isbn: string }>(
      'SELECT isbn FROM livros WHERE id = $1',
      [corpo.id],
    );
    expect(rows[0]?.isbn.trim()).toBe(ISBNS[0]);
  });

  it('recusa ISBN invalido com 422', async () => {
    const { status, corpo } = await criarLivro({
      ...livroExemplo,
      isbn: '9780306406158',
    });
    expect(status).toBe(422);
    expect(corpo.codigo).toBe('validacao');
  });

  it('recusa ISBN duplicado com 409', async () => {
    await criarLivro();
    const { status, corpo } = await criarLivro({ ...livroExemplo, titulo: 'Outro' });
    expect(status).toBe(409);
    expect(corpo.codigo).toBe('isbn_duplicado');
  });

  it('recusa payload sem titulo com 422', async () => {
    const { status } = await criarLivro({ autor: 'X', isbn: ISBNS[1] });
    expect(status).toBe(422);
  });
});

describe('GET /livros', () => {
  it('lista os livros cadastrados', async () => {
    await criarLivro();
    await criarLivro({ titulo: 'Outro', autor: 'Autor', isbn: ISBNS[1] });

    const { status, corpo } = await getJson<LivroResposta[]>(ctx.app, '/livros');
    expect(status).toBe(200);
    expect(corpo).toHaveLength(2);
  });

  it('devolve 404 para livro inexistente', async () => {
    const { status } = await getJson<ErroResposta>(ctx.app, '/livros/9999');
    expect(status).toBe(404);
  });
});

describe('fluxo de emprestimo', () => {
  it('empresta, marca indisponivel e persiste a data prevista', async () => {
    const livro = await criarLivro();

    const emprestimo = await postJson<EmprestimoResposta>(ctx.app, '/emprestimos', {
      livroId: livro.corpo.id,
      membro: 'ana',
    });

    expect(emprestimo.status).toBe(201);
    expect(new Date(emprestimo.corpo.dataPrevista).toISOString()).toBe(
      '2026-03-15T12:00:00.000Z',
    );

    const consulta = await getJson<LivroResposta>(ctx.app, `/livros/${livro.corpo.id}`);
    expect(consulta.corpo.disponivel).toBe(false);
  });

  it('recusa o segundo emprestimo do mesmo livro com 409', async () => {
    const livro = await criarLivro();
    await postJson<EmprestimoResposta>(ctx.app, '/emprestimos', {
      livroId: livro.corpo.id,
      membro: 'ana',
    });

    const segundo = await postJson<ErroResposta>(ctx.app, '/emprestimos', {
      livroId: livro.corpo.id,
      membro: 'bruno',
    });

    expect(segundo.status).toBe(409);
    expect(segundo.corpo.codigo).toBe('livro_indisponivel');
  });

  it('o indice parcial do banco impede dois emprestimos ativos do mesmo livro', async () => {
    const livro = await criarLivro();
    await postJson<EmprestimoResposta>(ctx.app, '/emprestimos', {
      livroId: livro.corpo.id,
      membro: 'ana',
    });

    // Tentativa de burlar o servico, inserindo direto no banco.
    await expect(
      ctx.pool.query(
        `INSERT INTO emprestimos (livro_id, membro, data_prevista)
         VALUES ($1, 'fraude', now())`,
        [livro.corpo.id],
      ),
    ).rejects.toThrow(/emprestimo_ativo_unico/);
  });

  it('bloqueia o quarto emprestimo ativo do mesmo membro', async () => {
    const ids: number[] = [];
    for (const isbn of ISBNS.slice(0, 4)) {
      const livro = await criarLivro({ titulo: `L-${isbn}`, autor: 'A', isbn });
      ids.push(livro.corpo.id);
    }

    for (const id of ids.slice(0, 3)) {
      const r = await postJson<EmprestimoResposta>(ctx.app, '/emprestimos', {
        livroId: id,
        membro: 'ana',
      });
      expect(r.status).toBe(201);
    }

    const quarto = await postJson<ErroResposta>(ctx.app, '/emprestimos', {
      livroId: ids[3],
      membro: 'ana',
    });

    expect(quarto.status).toBe(409);
    expect(quarto.corpo.codigo).toBe('limite_atingido');
  });
});

describe('fluxo de devolucao', () => {
  async function emprestar(
    membro = 'ana',
  ): Promise<{ livroId: number; emprestimoId: number }> {
    const livro = await criarLivro();
    const emprestimo = await postJson<EmprestimoResposta>(ctx.app, '/emprestimos', {
      livroId: livro.corpo.id,
      membro,
    });
    return { livroId: livro.corpo.id, emprestimoId: emprestimo.corpo.id };
  }

  it('devolve no prazo sem multa e libera o livro', async () => {
    const { livroId, emprestimoId } = await emprestar();
    ctx.definirAgora(new Date('2026-03-14T10:00:00Z'));

    const devolucao = await postJson<EmprestimoResposta>(
      ctx.app,
      `/emprestimos/${emprestimoId}/devolucao`,
    );

    expect(devolucao.status).toBe(200);
    expect(devolucao.corpo.multa).toBe('0.00');

    const livro = await getJson<LivroResposta>(ctx.app, `/livros/${livroId}`);
    expect(livro.corpo.disponivel).toBe(true);
  });

  it('cobra multa quando ha atraso e grava com duas casas', async () => {
    const { emprestimoId } = await emprestar();
    ctx.definirAgora(new Date('2026-03-19T10:00:00Z'));

    const devolucao = await postJson<EmprestimoResposta>(
      ctx.app,
      `/emprestimos/${emprestimoId}/devolucao`,
    );
    expect(devolucao.corpo.multa).toBe('6.00');

    const { rows } = await ctx.pool.query<{ multa: string }>(
      'SELECT multa FROM emprestimos WHERE id = $1',
      [emprestimoId],
    );
    expect(rows[0]?.multa).toBe('6.00');
  });

  it('permite novo emprestimo do livro apos a devolucao', async () => {
    const { livroId, emprestimoId } = await emprestar();
    ctx.definirAgora(new Date('2026-03-10T10:00:00Z'));
    await postJson<EmprestimoResposta>(ctx.app, `/emprestimos/${emprestimoId}/devolucao`);

    const novo = await postJson<EmprestimoResposta>(ctx.app, '/emprestimos', {
      livroId,
      membro: 'bruno',
    });

    expect(novo.status).toBe(201);
  });

  it('recusa devolucao repetida com 409', async () => {
    const { emprestimoId } = await emprestar();
    ctx.definirAgora(new Date('2026-03-10T10:00:00Z'));
    await postJson<EmprestimoResposta>(ctx.app, `/emprestimos/${emprestimoId}/devolucao`);

    const repetida = await postJson<ErroResposta>(
      ctx.app,
      `/emprestimos/${emprestimoId}/devolucao`,
    );
    expect(repetida.status).toBe(409);
    expect(repetida.corpo.codigo).toBe('ja_devolvido');
  });
});
