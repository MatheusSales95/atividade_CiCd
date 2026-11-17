// O tsc compila apenas .ts; as migracoes .sql precisam ser copiadas para o dist,
// porque migrate.js as le em tempo de execucao a partir do proprio diretorio.
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist/db/migrations', { recursive: true });
cpSync('src/db/migrations', 'dist/db/migrations', { recursive: true });

console.info('Migracoes copiadas para dist/db/migrations');
