-- ============================================
-- Migração 002: tours de onboarding já vistos por usuário
-- Rodar UMA vez no banco que já existe (quem cria o banco do zero com
-- "tutorial biblioteca.sql" já recebe a coluna).
--
-- Guarda uma lista JSON com as chaves dos tours concluídos ou pulados
-- (ex.: ["workspaces", "tabs-admin"]). NULL = nenhum tour visto ainda, então
-- todos os usuários atuais verão o onboarding no próximo acesso.
-- ============================================
USE biblioteca_tutoriais;

ALTER TABLE users
    ADD COLUMN onboarding_seen JSON NULL AFTER password_hash;
