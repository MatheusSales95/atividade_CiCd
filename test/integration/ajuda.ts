import type { Express } from 'express';
import type { Pool } from 'pg';
import request from 'supertest';
import { migrar } from '../../src/db/migrate';
import { fecharPool, obterPool } from '../../src/db/pool';
import { criarApp } from '../../src/http/app';
import { PgEmprestimoRepository } from '../../src/repositories/emprestimoRepository';
import { PgLivroRepository } from '../../src/repositories/livroRepository';
import { EmprestimoService } from '../../src/services/emprestimoService';
import { LivroService } from '../../src/services/livroService';

export interface Contexto {
  app: Express;
  pool: Pool;
  /** Relogio controlavel: permite simular atraso sem esperar dias. */
  definirAgora: (data: Date) => void;
}

export async function prepararContexto(): Promise<Contexto> {
  const pool = obterPool();
  await migrar();

  let agora = new Date();

  const livroService = new LivroService(new PgLivroRepository(pool));
  const emprestimoService = new EmprestimoService(
    new PgEmprestimoRepository(pool),
    new PgLivroRepository(pool),
    () => agora,
  );

  return {
    app: criarApp(livroService, emprestimoService),
    pool,
    definirAgora: (data: Date) => {
      agora = data;
    },
  };
}

/** Deixa o banco limpo entre os testes, sem recriar o esquema. */
export async function limparTabelas(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE emprestimos, livros RESTART IDENTITY CASCADE');
}

export async function encerrarContexto(): Promise<void> {
  await fecharPool();
}

/* ─────────────── Respostas da API, tipadas ─────────────── */

export interface LivroResposta {
  id: number;
  titulo: string;
  autor: string;
  isbn: string;
  disponivel: boolean;
  criadoEm: string;
}

export interface EmprestimoResposta {
  id: number;
  livroId: number;
  membro: string;
  dataEmprestimo: string;
  dataPrevista: string;
  dataDevolucao: string | null;
  multa: string | null;
}

export interface ErroResposta {
  codigo: string;
  mensagem: string;
}

export interface RespostaTipada<T> {
  status: number;
  corpo: T;
}

/**
 * O supertest declara `body` como `any`. Converter aqui, num unico ponto, evita
 * que o `any` se espalhe pelos testes e mantem a analise estatica util.
 */
function tipar<T>(status: number, body: unknown): RespostaTipada<T> {
  return { status, corpo: body as T };
}

export async function getJson<T>(app: Express, rota: string): Promise<RespostaTipada<T>> {
  const resposta = await request(app).get(rota);
  return tipar<T>(resposta.status, resposta.body);
}

export async function postJson<T>(
  app: Express,
  rota: string,
  corpo: object | string = {},
): Promise<RespostaTipada<T>> {
  const resposta = await request(app).post(rota).send(corpo);
  return tipar<T>(resposta.status, resposta.body);
}

export const ISBNS = [
  '9788533302273',
  '9780306406157',
  '9788535902778',
  '9788575225639',
  '9788539004263',
] as const;
