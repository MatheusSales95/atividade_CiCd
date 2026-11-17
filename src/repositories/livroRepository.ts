import type { Pool } from 'pg';
import type { Livro, NovoLivro } from '../domain/tipos';
import type { LivroRepository } from './tipos';

interface LinhaLivro {
  id: number;
  titulo: string;
  autor: string;
  isbn: string;
  disponivel: boolean;
  criado_em: Date;
}

function paraLivro(linha: LinhaLivro): Livro {
  return {
    id: linha.id,
    titulo: linha.titulo,
    autor: linha.autor,
    isbn: linha.isbn.trim(),
    disponivel: linha.disponivel,
    criadoEm: linha.criado_em,
  };
}

const COLUNAS = 'id, titulo, autor, isbn, disponivel, criado_em';

export class PgLivroRepository implements LivroRepository {
  constructor(private readonly pool: Pool) {}

  async listar(): Promise<Livro[]> {
    const { rows } = await this.pool.query<LinhaLivro>(
      `SELECT ${COLUNAS} FROM livros ORDER BY id`,
    );
    return rows.map(paraLivro);
  }

  async buscarPorId(id: number): Promise<Livro | null> {
    const { rows } = await this.pool.query<LinhaLivro>(
      `SELECT ${COLUNAS} FROM livros WHERE id = $1`,
      [id],
    );
    const linha = rows[0];
    return linha ? paraLivro(linha) : null;
  }

  async buscarPorIsbn(isbn: string): Promise<Livro | null> {
    const { rows } = await this.pool.query<LinhaLivro>(
      `SELECT ${COLUNAS} FROM livros WHERE isbn = $1`,
      [isbn],
    );
    const linha = rows[0];
    return linha ? paraLivro(linha) : null;
  }

  async inserir(livro: NovoLivro): Promise<Livro> {
    const { rows } = await this.pool.query<LinhaLivro>(
      `INSERT INTO livros (titulo, autor, isbn)
       VALUES ($1, $2, $3)
       RETURNING ${COLUNAS}`,
      [livro.titulo, livro.autor, livro.isbn],
    );
    const linha = rows[0];
    if (!linha) throw new Error('INSERT nao retornou linha');
    return paraLivro(linha);
  }
}
