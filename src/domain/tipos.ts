export interface Livro {
  id: number;
  titulo: string;
  autor: string;
  isbn: string;
  disponivel: boolean;
  criadoEm: Date;
}

export interface Emprestimo {
  id: number;
  livroId: number;
  membro: string;
  dataEmprestimo: Date;
  dataPrevista: Date;
  dataDevolucao: Date | null;
  multa: string | null;
}

export type NovoLivro = Pick<Livro, 'titulo' | 'autor' | 'isbn'>;
