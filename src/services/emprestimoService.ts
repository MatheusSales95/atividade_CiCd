import { calcularDataPrevista, calcularMulta, podeEmprestar } from '../domain/emprestimo';
import { LIMITE_EMPRESTIMOS_ATIVOS } from '../domain/emprestimo';
import type { Emprestimo } from '../domain/tipos';
import { ErroDeConflito, ErroNaoEncontrado } from '../http/errors';
import type { EmprestimoRepository, LivroRepository } from '../repositories/tipos';

export class EmprestimoService {
  constructor(
    private readonly emprestimos: EmprestimoRepository,
    private readonly livros: LivroRepository,
    /** Injetado para que os testes controlem o tempo. */
    private readonly agora: () => Date = () => new Date(),
  ) {}

  async buscarPorId(id: number): Promise<Emprestimo> {
    const emprestimo = await this.emprestimos.buscarPorId(id);
    if (!emprestimo) throw new ErroNaoEncontrado(`Emprestimo ${id} nao encontrado`);
    return emprestimo;
  }

  async emprestar(livroId: number, membro: string): Promise<Emprestimo> {
    const livro = await this.livros.buscarPorId(livroId);
    if (!livro) throw new ErroNaoEncontrado(`Livro ${livroId} nao encontrado`);

    if (!livro.disponivel) {
      throw new ErroDeConflito(
        'livro_indisponivel',
        `Livro ${livroId} ja esta emprestado`,
      );
    }

    const ativos = await this.emprestimos.contarAtivosDoMembro(membro);
    if (!podeEmprestar(ativos)) {
      throw new ErroDeConflito(
        'limite_atingido',
        `Membro ja possui ${LIMITE_EMPRESTIMOS_ATIVOS} emprestimos ativos`,
      );
    }

    const dataEmprestimo = this.agora();

    return this.emprestimos.abrir({
      livroId,
      membro: membro.trim(),
      dataEmprestimo,
      dataPrevista: calcularDataPrevista(dataEmprestimo),
    });
  }

  async devolver(id: number): Promise<Emprestimo> {
    const emprestimo = await this.buscarPorId(id);

    if (emprestimo.dataDevolucao !== null) {
      throw new ErroDeConflito('ja_devolvido', `Emprestimo ${id} ja foi devolvido`);
    }

    const dataDevolucao = this.agora();

    return this.emprestimos.fechar({
      id: emprestimo.id,
      livroId: emprestimo.livroId,
      dataDevolucao,
      multa: calcularMulta(emprestimo.dataPrevista, dataDevolucao),
    });
  }
}
