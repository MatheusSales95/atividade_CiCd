import { obterPool } from './db/pool';
import { criarApp } from './http/app';
import { PgEmprestimoRepository } from './repositories/emprestimoRepository';
import { PgLivroRepository } from './repositories/livroRepository';
import { EmprestimoService } from './services/emprestimoService';
import { LivroService } from './services/livroService';

const porta = Number(process.env.PORT ?? 8080);

const pool = obterPool();
const livroService = new LivroService(new PgLivroRepository(pool));
const emprestimoService = new EmprestimoService(
  new PgEmprestimoRepository(pool),
  new PgLivroRepository(pool),
);

const app = criarApp(livroService, emprestimoService);

const servidor = app.listen(porta, () => {
  console.info(`API da biblioteca ouvindo na porta ${porta}`);
});

for (const sinal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sinal, () => {
    servidor.close(() => process.exit(0));
  });
}
