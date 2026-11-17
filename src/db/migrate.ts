import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fecharPool, obterPool } from './pool';

const DIRETORIO = join(__dirname, 'migrations');

/**
 * Aplica as migracoes ainda nao registradas, em ordem de nome de arquivo.
 * Cada migracao roda dentro de uma transacao: ou aplica inteira, ou nao aplica.
 */
export async function migrar(): Promise<string[]> {
  const pool = obterPool();
  const aplicadas: string[] = [];

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      nome       TEXT PRIMARY KEY,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // DIRETORIO e constante do modulo, nao vem de entrada externa.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const arquivos = readdirSync(DIRETORIO)
    .filter((nome) => nome.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    const jaAplicada = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE nome = $1',
      [arquivo],
    );
    if ((jaAplicada.rowCount ?? 0) > 0) continue;

    // vem da listagem do proprio DIRETORIO, filtrada por extensao .sql.
    // `arquivo` vem da listagem do proprio DIRETORIO, filtrada por .sql.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const sql = readFileSync(join(DIRETORIO, arquivo), 'utf8');
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [arquivo]);
      await cliente.query('COMMIT');
      aplicadas.push(arquivo);
    } catch (erro) {
      await cliente.query('ROLLBACK');
      throw erro;
    } finally {
      cliente.release();
    }
  }

  return aplicadas;
}

if (require.main === module) {
  migrar()
    .then(async (aplicadas) => {
      const resumo =
        aplicadas.length > 0 ? aplicadas.join(', ') : 'nenhuma (banco ja atualizado)';
      console.info(`Migracoes aplicadas: ${resumo}`);
      await fecharPool();
    })
    .catch(async (erro: unknown) => {
      console.error('Falha ao migrar:', erro);
      await fecharPool();
      process.exit(1);
    });
}
