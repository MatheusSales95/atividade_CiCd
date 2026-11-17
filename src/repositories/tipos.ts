import type { Emprestimo, Livro, NovoLivro } from '../domain/tipos';

export interface LivroRepository {
  listar(): Promise<Livro[]>;
  buscarPorId(id: number): Promise<Livro | null>;
  buscarPorIsbn(isbn: string): Promise<Livro | null>;
  inserir(livro: NovoLivro): Promise<Livro>;
}

export interface EmprestimoRepository {
  buscarPorId(id: number): Promise<Emprestimo | null>;
  contarAtivosDoMembro(membro: string): Promise<number>;
  /** Cria o emprestimo e marca o livro como indisponivel na mesma transacao. */
  abrir(entrada: {
    livroId: number;
    membro: string;
    dataEmprestimo: Date;
    dataPrevista: Date;
  }): Promise<Emprestimo>;
  /** Registra a devolucao e libera o livro na mesma transacao. */
  fechar(entrada: {
    id: number;
    livroId: number;
    dataDevolucao: Date;
    multa: number;
  }): Promise<Emprestimo>;
}
