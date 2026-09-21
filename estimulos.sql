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
    tipo TEXT NOT NULL CHECK (tipo IN ('pasta', 'escrito', 'foto', 'audio', 'link', 'documento')),
    titulo TEXT NOT NULL,
    conteudo TEXT,
    parent_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    data TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE
    id_type TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'materials' AND column_name = 'parent_id'
    ) THEN
        SELECT format_type(attribute.atttypid, attribute.atttypmod)
        INTO id_type
        FROM pg_attribute AS attribute
        JOIN pg_class AS relation ON relation.oid = attribute.attrelid
        WHERE relation.relname = 'materials' AND attribute.attname = 'id';
        EXECUTE format('ALTER TABLE materials ADD COLUMN parent_id %s REFERENCES materials(id) ON DELETE CASCADE', id_type);
    END IF;
END $$;
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_tipo_check;
ALTER TABLE materials ADD CONSTRAINT materials_tipo_check CHECK (tipo IN ('pasta', 'escrito', 'foto', 'audio', 'link', 'documento'));
CREATE INDEX IF NOT EXISTS materials_parent_id_idx ON materials(parent_id);

INSERT INTO materials (user_id, materia, tipo, titulo)
SELECT DISTINCT materiais.user_id, materiais.materia, 'pasta', materiais.materia
FROM materials AS materiais
WHERE materiais.tipo <> 'pasta'
    AND materiais.materia IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM materials AS pastas
        WHERE pastas.user_id = materiais.user_id
            AND pastas.tipo = 'pasta'
            AND pastas.parent_id IS NULL
            AND pastas.titulo = materiais.materia
    );

UPDATE materials AS materiais
SET parent_id = pastas.id
FROM materials AS pastas
WHERE materiais.tipo <> 'pasta'
    AND materiais.parent_id IS NULL
    AND pastas.user_id = materiais.user_id
    AND pastas.tipo = 'pasta'
    AND pastas.parent_id IS NULL
    AND pastas.titulo = materiais.materia;