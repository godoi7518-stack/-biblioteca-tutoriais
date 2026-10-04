-- ============================================
-- Migração 003: busca dentro dos passos
-- Rodar UMA vez no banco que já existe (quem cria o banco do zero com
-- "tutorial biblioteca.sql" já recebe o índice).
--
-- Sem este índice, o texto dos tutoriais passo a passo (que fica em
-- tutorial_steps, não em tutorials.content) não era encontrado pela busca.
-- Não muda nenhum dado: só cria o índice de busca.
-- ============================================
USE biblioteca_tutoriais;

ALTER TABLE tutorial_steps
    ADD FULLTEXT INDEX ft_steps (title, content);
