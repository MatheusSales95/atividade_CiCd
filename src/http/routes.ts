import { Router } from 'express';
import { z } from 'zod';
import type { EmprestimoService } from '../services/emprestimoService';
import type { LivroService } from '../services/livroService';
import { ErroDeValidacao } from './errors';

const novoLivroSchema = z.object({
  titulo: z.string().trim().min(1, 'titulo obrigatorio').max(300),
  autor: z.string().trim().min(1, 'autor obrigatorio').max(200),
  isbn: z.string().trim().min(10).max(17),
});

const novoEmprestimoSchema = z.object({
  livroId: z.number().int().positive(),
  membro: z.string().trim().min(1, 'membro obrigatorio').max(120),
});

const idSchema = z.coerce.number().int().positive();

function validarId(valor: string | undefined): number {
  const resultado = idSchema.safeParse(valor);
  if (!resultado.success) throw new ErroDeValidacao('id invalido');
  return resultado.data;
}

export function criarRotas(
  livroService: LivroService,
  emprestimoService: EmprestimoService,
): Router {
  const rotas = Router();

  rotas.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  rotas.get('/livros', async (_req, res) => {
    res.json(await livroService.listar());
  });

  rotas.get('/livros/:id', async (req, res) => {
    res.json(await livroService.buscarPorId(validarId(req.params.id)));
  });

  rotas.post('/livros', async (req, res) => {
    const analise = novoLivroSchema.safeParse(req.body);
    if (!analise.success) {
      throw new ErroDeValidacao(analise.error.issues.map((i) => i.message).join('; '));
    }
    res.status(201).json(await livroService.criar(analise.data));
  });

  rotas.post('/emprestimos', async (req, res) => {
    const analise = novoEmprestimoSchema.safeParse(req.body);
    if (!analise.success) {
      throw new ErroDeValidacao(analise.error.issues.map((i) => i.message).join('; '));
    }
    const { livroId, membro } = analise.data;
    res.status(201).json(await emprestimoService.emprestar(livroId, membro));
  });

  rotas.get('/emprestimos/:id', async (req, res) => {
    res.json(await emprestimoService.buscarPorId(validarId(req.params.id)));
  });

  rotas.post('/emprestimos/:id/devolucao', async (req, res) => {
    res.json(await emprestimoService.devolver(validarId(req.params.id)));
  });

  return rotas;
}
