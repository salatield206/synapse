CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS estimulos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('escrito', 'foto', 'audio', 'link', 'documento')),
    titulo TEXT NOT NULL,
    conteudo_url TEXT,
    texto_nota TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);