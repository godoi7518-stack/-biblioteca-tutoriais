-- ============================================
-- Migração 001: matrícula do usuário
-- Rodar UMA vez no banco que já existe (quem cria o banco do zero com
-- "tutorial biblioteca.sql" já recebe a coluna e não precisa disto).
--
-- A coluna é NULL no banco de propósito: os usuários cadastrados antes
-- desta mudança não têm matrícula, e um NOT NULL faria o ALTER falhar.
-- A obrigatoriedade para cadastros novos é garantida pelo backend
-- (schema UserCreate). O índice UNIQUE aceita vários NULL no MySQL, então
-- os usuários antigos não conflitam entre si.
-- ============================================
USE biblioteca_tutoriais;

ALTER TABLE users
    ADD COLUMN matricula VARCHAR(30) NULL AFTER email,
    ADD CONSTRAINT uq_users_matricula UNIQUE (matricula);
