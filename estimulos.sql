CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    materia TEXT NOT NULL DEFAULT 'Sem matéria',
    tipo TEXT NOT NULL CHECK (tipo IN ('escrito', 'foto', 'audio', 'link', 'documento')),
    titulo TEXT NOT NULL,
    conteudo TEXT,
    data TIMESTAMPTZ NOT NULL DEFAULT now()
);