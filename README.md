# 📚 Biblioteca de Tutoriais

Plataforma web para centralizar e organizar tutoriais internos de uma empresa, permitindo que um administrador crie um grupo de trabalho, organize conteúdo por categorias e conceda acesso controlado a parceiros e funcionários.

## 🎯 Objetivo

Empresas frequentemente possuem processos internos (reimpressão de documentos, fechamento de caixa, procedimentos operacionais) que ficam dispersos em conversas, planilhas ou na memória de poucas pessoas. Este projeto propõe uma biblioteca centralizada, onde:

- Um **administrador** cria um grupo de trabalho e organiza o conteúdo em categorias (abas)
- **Parceiros/funcionários** acessam esse conteúdo de forma somente leitura, com busca integrada
- Tutoriais podem ser simples (texto corrido) ou estruturados em passos, com suporte a imagens e destaque para etapas críticas

## 🧱 Status atual do projeto

**Backend**
- [x] Modelagem e criação do banco de dados (MySQL)
- [x] Estrutura de pastas do backend (models, schemas, routers, core)
- [x] Autenticação (registro e login com JWT)
- [x] Endpoints de workspaces, tabs e tutorials (+ passos)
- [x] Rotas protegidas (autorização por papel: admin vs. membro)
- [x] Upload, listagem e remoção de imagens de tutorial

**Frontend**
- [x] Login integrado à API real (JWT)
- [x] Listagem e criação de workspaces
- [x] Listagem e criação de categorias (tabs)
- [x] Listagem, criação e visualização de tutoriais (tipo texto corrido, com exibição em lista expansível)
- [ ] Criação de tutoriais estruturados (por passos)
- [ ] Busca integrada (ainda usa dados de exemplo)
- [ ] Upload de imagens pela interface
- [ ] Tutorial guiado de apresentação da plataforma (onboarding)

> Projeto em desenvolvimento incremental. Backend funcionalmente completo; frontend em processo de integração com a API real.

## 🗂️ Estrutura do repositório

```
biblioteca-tutoriais/
├── backend/       # API em FastAPI + SQLAlchemy
├── frontend/      # Interface em React (Vite)
├── database/      # Script de criação do banco (schema.sql)
├── .gitignore
└── README.md
```


## 🗃️ Modelo de dados

O banco é estruturado em torno dos seguintes conceitos:

| Tabela              | Descrição                                                                 |
|----------------------|----------------------------------------------------------------------------|
| `users`              | Usuários da plataforma                                                     |
| `workspaces`         | Grupo de trabalho criado pelo administrador                                |
| `memberships`        | Vínculo entre usuário e workspace, com papel (`admin` ou `member`)         |
| `tabs`               | Categorias/abas de conteúdo dentro de um workspace                         |
| `tutorials`          | Tutoriais, podendo ser `simple` (texto corrido) ou `structured` (passos)   |
| `tutorial_steps`     | Passos individuais de um tutorial estruturado                              |
| `tutorial_images`    | Imagens vinculadas a um tutorial ou a um passo específico                  |

O modelo suporta busca full-text (`FULLTEXT`) sobre título, resumo e conteúdo dos tutoriais.

## 🛠️ Stack

- **Banco de dados:** MySQL
- **Backend:** Python + FastAPI + SQLAlchemy
- **Frontend:** React + Vite

## ⚙️ Como executar o banco de dados

**Pré-requisitos:** MySQL Server 8+ instalado (localmente ou via Docker).

1. Abra o MySQL Workbench (ou outro cliente MySQL de sua preferência)
2. Execute o script completo em `database/schema.sql`

O script já contém `CREATE DATABASE IF NOT EXISTS` e `USE`, portanto cria o banco automaticamente ao ser executado.

## ⚙️ Como executar o backend

**Pré-requisitos:** Python 3.10+ e o banco de dados já criado (ver seção acima).

1. Entre na pasta `backend`
2. Crie e ative o ambiente virtual: 
python -m venv venv
venv\Scripts\activate
3. Instale as dependências:
pip install -r requirements.txt
4. Crie um arquivo `.env` na pasta `backend` com as variáveis de conexão (veja `.env` de exemplo, se disponibilizado)
5. Suba o servidor:
uvicorn app.main:app --reload
6. Acesse a documentação interativa em `http://127.0.0.1:8000/docs`

## ⚙️ Como executar o frontend

**Pré-requisitos:** Node.js instalado, e o backend já rodando (ver seção acima) — a interface consome a API em `http://127.0.0.1:8000`.

1. Entre na pasta `frontend`
2. Instale as dependências:
npm install
3. Suba o servidor de desenvolvimento:
npm run dev
4. Acesse `http://localhost:5173`

---

Projeto pessoal em desenvolvimento por [Gabriel].