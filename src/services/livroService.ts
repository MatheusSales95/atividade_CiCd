import { isbnValido, normalizarIsbn } from '../domain/isbn';
import type { Livro, NovoLivro } from '../domain/tipos';
import { ErroDeConflito, ErroDeValidacao, ErroNaoEncontrado } from '../http/errors';
import type { LivroRepository } from '../repositories/tipos';

export class LivroService {
  constructor(private readonly repositorio: LivroRepository) {}

  async listar(): Promise<Livro[]> {
    return this.repositorio.listar();
  }

  async buscarPorId(id: number): Promise<Livro> {
    const livro = await this.repositorio.buscarPorId(id);
    if (!livro) throw new ErroNaoEncontrado(`Livro ${id} nao encontrado`);
    return livro;
  }

  async criar(entrada: NovoLivro): Promise<Livro> {
    const isbn = normalizarIsbn(entrada.isbn);

    if (!isbnValido(isbn)) {
      throw new ErroDeValidacao(`ISBN invalido: ${entrada.isbn}`);
    }

    const existente = await this.repositorio.buscarPorIsbn(isbn);
    if (existente) {
      throw new ErroDeConflito('isbn_duplicado', `Ja existe livro com o ISBN ${isbn}`);
    }

    return this.repositorio.inserir({
      titulo: entrada.titulo.trim(),
      autor: entrada.autor.trim(),
      isbn,
    });
  }
}
