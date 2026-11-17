-- Esquema inicial da biblioteca.

CREATE TABLE IF NOT EXISTS livros (
    id          SERIAL PRIMARY KEY,
    titulo      TEXT        NOT NULL CHECK (length(btrim(titulo)) > 0),
    autor       TEXT        NOT NULL CHECK (length(btrim(autor)) > 0),
    isbn        CHAR(13)    NOT NULL UNIQUE CHECK (isbn ~ '^[0-9]{13}$'),
    disponivel  BOOLEAN     NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emprestimos (
    id              SERIAL PRIMARY KEY,
    livro_id        INTEGER     NOT NULL REFERENCES livros (id) ON DELETE RESTRICT,
    membro          TEXT        NOT NULL CHECK (length(btrim(membro)) > 0),
    data_emprestimo TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_prevista   TIMESTAMPTZ NOT NULL,
    data_devolucao  TIMESTAMPTZ,
    multa           NUMERIC(10, 2) CHECK (multa IS NULL OR multa >= 0),

    -- A devolucao nunca pode ser anterior ao emprestimo.
    CONSTRAINT devolucao_coerente
        CHECK (data_devolucao IS NULL OR data_devolucao >= data_emprestimo)
);

-- Um livro so pode ter UM emprestimo em aberto. A regra vale no servico, mas
-- fica garantida tambem aqui: o banco e a ultima linha de defesa contra corrida.
CREATE UNIQUE INDEX IF NOT EXISTS emprestimo_ativo_unico
    ON emprestimos (livro_id)
    WHERE data_devolucao IS NULL;

CREATE INDEX IF NOT EXISTS emprestimos_membro_idx
    ON emprestimos (membro)
    WHERE data_devolucao IS NULL;
