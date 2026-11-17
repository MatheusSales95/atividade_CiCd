# API Biblioteca — Pipeline de Integração Contínua

API REST de gestão de empréstimos de livros, com PostgreSQL, usada como base para
demonstrar um workflow de **Integração Contínua** no GitHub Actions.

O pipeline implementa o roteiro definido na atividade anterior: as etapas são
ordenadas por custo crescente, de modo que a verificação mais barata capaz de
reprovar o código seja sempre a primeira a rodar.

## Pipeline

| #   | Etapa                         | Ferramenta                      |
| --- | ----------------------------- | ------------------------------- |
| 1   | Análise estática de código    | ESLint + `tsc --noEmit`         |
| 1   | Análise de formatação         | Prettier                        |
| 2   | Análise estática de segurança | CodeQL + `npm audit` + Gitleaks |
| 3   | Build                         | `tsc`                           |
| 4a  | Teste unitário                | Vitest                          |
| 4b  | Teste de integração           | Vitest + Supertest + PostgreSQL |
| 5   | Criação de imagem             | Docker Buildx + smoke test      |

Gatilho: **Pull Request** para `main`.

## Endpoints

| Método | Rota                         | Descrição                                      |
| ------ | ---------------------------- | ---------------------------------------------- |
| `GET`  | `/health`                    | Verificação de saúde                           |
| `GET`  | `/livros`                    | Lista os livros                                |
| `POST` | `/livros`                    | Cadastra um livro (valida o dígito do ISBN-13) |
| `GET`  | `/livros/:id`                | Consulta um livro                              |
| `POST` | `/emprestimos`               | Abre um empréstimo                             |
| `GET`  | `/emprestimos/:id`           | Consulta um empréstimo                         |
| `POST` | `/emprestimos/:id/devolucao` | Registra a devolução e calcula a multa         |

## Regras de negócio

- ISBN-13 validado pelo dígito verificador.
- Prazo de empréstimo: 14 dias.
- Multa de R$ 1,50 por dia de atraso, limitada a R$ 30,00.
- Devolução no dia do vencimento não gera multa.
- Máximo de 3 empréstimos ativos por membro.
- Um livro só pode ter um empréstimo em aberto — garantido também por índice
  parcial único no banco.

## Executando localmente

```bash
npm ci
docker run -d --name pg -e POSTGRES_PASSWORD=biblioteca -e POSTGRES_USER=biblioteca \
  -e POSTGRES_DB=biblioteca -p 5432:5432 postgres:16-alpine

export DATABASE_URL=postgresql://biblioteca:biblioteca@localhost:5432/biblioteca
npm run build && npm run db:migrate && npm start
```

## Verificações

```bash
npm run format:check   # formatação
npm run lint           # análise estática
npm run typecheck      # tipos
npm run security:audit # dependências vulneráveis
npm run build          # build
npm run test:unit      # testes unitários
npm run test:integration  # testes de integração (requer DATABASE_URL)
```
