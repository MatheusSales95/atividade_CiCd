import { Pool } from 'pg';

let pool: Pool | undefined;

export function obterPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL nao definida');
    }
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function fecharPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
