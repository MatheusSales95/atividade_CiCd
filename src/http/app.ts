import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import type { EmprestimoService } from '../services/emprestimoService';
import type { LivroService } from '../services/livroService';
import { ErroDeAplicacao } from './errors';
import { criarRotas } from './routes';

export function criarApp(
  livroService: LivroService,
  emprestimoService: EmprestimoService,
): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));
  app.use(criarRotas(livroService, emprestimoService));

  app.use((_req, res) => {
    res.status(404).json({ codigo: 'rota_nao_encontrada', mensagem: 'Rota inexistente' });
  });

  // Middleware de erro do Express: a assinatura de 4 parametros e obrigatoria.
  app.use((erro: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (erro instanceof ErroDeAplicacao) {
      res.status(erro.status).json({ codigo: erro.codigo, mensagem: erro.message });
      return;
    }

    console.error('Erro nao tratado:', erro);
    res.status(500).json({ codigo: 'erro_interno', mensagem: 'Erro interno' });
  });

  return app;
}
