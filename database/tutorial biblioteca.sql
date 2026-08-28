CREATE DATABASE IF NOT EXISTS biblioteca_tutoriais;
USE biblioteca_tutoriais;
-- ============================================
-- USUÁRIOS
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GRUPOS (workspace do admin)
-- ============================================
CREATE TABLE workspaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    owner_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- ============================================
-- MEMBROS DO GRUPO (admin ou parceiro/funcionário)
-- ============================================
CREATE TABLE memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    workspace_id INT NOT NULL,          --  renomeado
    role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_group (user_id, workspace_id),   --  atualizado aqui também
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE TABLE tabs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,          --  renomeado
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255),
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- ============================================
-- TUTORIAIS
-- content_type define se usa `content` (markdown livre)
-- ou a tabela tutorial_steps (passo a passo estruturado)
-- ============================================
CREATE TABLE tutorials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tab_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(300),
    content_type ENUM('simple', 'structured') NOT NULL DEFAULT 'simple',
    content MEDIUMTEXT,                  -- usado quando content_type = 'simple'
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tab_id) REFERENCES tabs(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FULLTEXT KEY ft_search (title, summary, content)
);

-- ============================================
-- PASSOS ESTRUTURADOS
-- usado quando tutorials.content_type = 'structured'
-- ============================================
CREATE TABLE tutorial_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tutorial_id INT NOT NULL,
    step_number INT NOT NULL,
    title VARCHAR(150),
    content TEXT NOT NULL,
    is_critical BOOLEAN DEFAULT FALSE,   -- destaque visual de atenção extra
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tutorial_id) REFERENCES tutorials(id) ON DELETE CASCADE
);

-- ============================================
-- IMAGENS
-- uma tabela só, reutilizável tanto pra tutorial "simple"
-- (imagens soltas ligadas ao tutorial) quanto "structured"
-- (imagens ligadas a um step específico)
-- ============================================
CREATE TABLE tutorial_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tutorial_id INT NOT NULL,
    step_id INT NULL,                    -- NULL quando é imagem solta de tutorial 'simple'
    image_url VARCHAR(255) NOT NULL,
    caption VARCHAR(200),
    position INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tutorial_id) REFERENCES tutorials(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES tutorial_steps(id) ON DELETE CASCADE
);

CREATE INDEX idx_tutorials_tab ON tutorials(tab_id);
CREATE INDEX idx_steps_tutorial ON tutorial_steps(tutorial_id, step_number);
CREATE INDEX idx_images_tutorial ON tutorial_images(tutorial_id);
CREATE INDEX idx_images_step ON tutorial_images(step_id);