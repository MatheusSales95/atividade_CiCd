import type { Pool } from 'pg';
import type { Emprestimo } from '../domain/tipos';
import type { EmprestimoRepository } from './tipos';

interface LinhaEmprestimo {
  id: number;
  livro_id: number;
  membro: string;
  data_emprestimo: Date;
  data_prevista: Date;
  data_devolucao: Date | null;
  multa: string | null;
}

function paraEmprestimo(linha: LinhaEmprestimo): Emprestimo {
  return {
    id: linha.id,
    livroId: linha.livro_id,
    membro: linha.membro,
    dataEmprestimo: linha.data_emprestimo,
    dataPrevista: linha.data_prevista,
    dataDevolucao: linha.data_devolucao,
    multa: linha.multa,
  };
}

const COLUNAS =
  'id, livro_id, membro, data_emprestimo, data_prevista, data_devolucao, multa';

export class PgEmprestimoRepository implements EmprestimoRepository {
  constructor(private readonly pool: Pool) {}

  async buscarPorId(id: number): Promise<Emprestimo | null> {
    const { rows } = await this.pool.query<LinhaEmprestimo>(
      `SELECT ${COLUNAS} FROM emprestimos WHERE id = $1`,
      [id],
    );
    const linha = rows[0];
    return linha ? paraEmprestimo(linha) : null;
  }

  async contarAtivosDoMembro(membro: string): Promise<number> {
    const { rows } = await this.pool.query<{ total: string }>(
      `SELECT count(*)::text AS total
         FROM emprestimos
        WHERE membro = $1 AND data_devolucao IS NULL`,
      [membro],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async abrir(entrada: {
    livroId: number;
    membro: string;
    dataEmprestimo: Date;
    dataPrevista: Date;
  }): Promise<Emprestimo> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');

      const { rows } = await cliente.query<LinhaEmprestimo>(
        `INSERT INTO emprestimos (livro_id, membro, data_emprestimo, data_prevista)
         VALUES ($1, $2, $3, $4)
         RETURNING ${COLUNAS}`,
        [entrada.livroId, entrada.membro, entrada.dataEmprestimo, entrada.dataPrevista],
      );

      await cliente.query('UPDATE livros SET disponivel = FALSE WHERE id = $1', [
        entrada.livroId,
      ]);

      await cliente.query('COMMIT');

      const linha = rows[0];
      if (!linha) throw new Error('INSERT nao retornou linha');
      return paraEmprestimo(linha);
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    } finally {
      cliente.release();
    }
  }

  async fechar(entrada: {
    id: number;
    livroId: number;
    dataDevolucao: Date;
    multa: number;
  }): Promise<Emprestimo> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');

      const { rows } = await cliente.query<LinhaEmprestimo>(
        `UPDATE emprestimos
            SET data_devolucao = $2, multa = $3
          WHERE id = $1
        RETURNING ${COLUNAS}`,
        [entrada.id, entrada.dataDevolucao, entrada.multa],
      );

      await cliente.query('UPDATE livros SET disponivel = TRUE WHERE id = $1', [
        entrada.livroId,
      ]);

      await cliente.query('COMMIT');

      const linha = rows[0];
      if (!linha) throw new Error('UPDATE nao retornou linha');
      return paraEmprestimo(linha);
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    } finally {
      cliente.release();
    }
  }
}
