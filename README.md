# 📚 Biblioteca de Tutoriais

A biblioteca de processos da sua empresa, em passos simples que qualquer pessoa consegue seguir.

Plataforma web para centralizar os procedimentos internos de uma equipe: reimpressão de etiquetas, fechamento de caixa, rotinas de linha, tudo o que hoje fica espalhado em conversas, planilhas ou na memória de poucas pessoas. Um administrador cria um **workspace**, organiza o conteúdo em **categorias** e convida a equipe. Os membros consultam e buscam os tutoriais, que podem ser escritos em **texto corrido** ou **passo a passo**, com etapas críticas em destaque e imagem em cada passo.

> Projeto pessoal em desenvolvimento ativo, feito por Gabriel Godoi. O código está público para fins de portfólio. Veja a [licença](#-licença).

## ✨ Funcionalidades

**Conteúdo**
- Tutoriais **passo a passo** (acordeão em que o leitor abre um passo por vez) ou em **texto corrido**, com negrito, listas e quebras de linha.
- **Etapas críticas** marcadas em vermelho, **imagens por passo** e uma galeria de imagens gerais, com visualizador em tela cheia.
- Criação e edição num formulário único:
  - **rascunho automático**: fechar sem querer não perde nada;
  - reordenar passos **arrastando** ou com setas;
  - salvamento **atômico** (tudo ou nada).

**Equipe e permissões**
- Workspaces com papéis **admin** e **membro**: só admin cria, edita e apaga; o membro só lê e busca.
- Convidar membros, trocar o papel, remover e **sair do workspace**, com a regra de que o workspace sempre tem pelo menos um admin.
- Cadastro com nome, e-mail e matrícula, e login com JWT.

**Busca**
- Busca global em workspaces, categorias e tutoriais, **incluindo o texto de dentro dos passos**.
- Cada resultado mostra **onde a palavra foi encontrada** (título, resumo, texto ou "passo 2"), com um trecho e a palavra destacada. Acentos e maiúsculas são ignorados.

**Experiência de uso**
- **Onboarding guiado**: um tour curto por tela, adaptado ao papel da pessoa, com botão "?" para rever.
- **Modo claro e escuro** e janelas próprias do site (sem as caixas nativas do navegador).

## 🛠️ Stack

| Camada | Tecnologias |
|---|---|
| Banco de dados | MySQL 8 (busca com índices FULLTEXT) |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic, JWT (python-jose), bcrypt |
| Frontend | React 18 + Vite, sem bibliotecas de UI (componentes, ícones e tour feitos no projeto) |

## 🧠 Decisões técnicas

Alguns pontos que vale olhar no código:

- **Autorização em camadas** (`backend/app/core/dependencies.py`): `get_current_user` → `get_workspace_membership` → `require_admin`. Toda rota confere se o usuário pertence ao workspace da URL. Toda entidade apontada por id (membro, passo, imagem) é conferida como pertencente a esse mesmo workspace, para impedir acesso cruzado trocando números na URL.
- **Edição atômica de tutoriais** (`backend/app/routers/tutorials.py`, `_sync_steps`): o frontend envia a lista completa de passos na ordem desejada. O backend atualiza, cria, apaga e renumera tudo numa única transação. Os arquivos de imagem só são removidos do disco **depois** do commit.
- **Regra do último admin** com `SELECT ... FOR UPDATE`: impede que dois admins se rebaixem ao mesmo tempo e deixem o workspace sem nenhum.
- **Busca** (`backend/app/routers/search.py`): FULLTEXT em modo BOOLEAN com prefixo, nos tutoriais e nos passos. Workspaces e categorias usam `LIKE` com curingas escapados. Tudo filtrado pelos workspaces do usuário.
- **Rascunhos** guardados por usuário no navegador, para que pessoas diferentes num mesmo computador não vejam o rascunho uma da outra. **"Tour já visto"** fica no banco, para valer em qualquer computador.

## 🗂️ Estrutura

```
biblioteca-tutoriais/
├── backend/             # API (FastAPI + SQLAlchemy)
│   └── app/
│       ├── core/        # segurança (JWT, hash) e dependências de autorização
│       ├── models/      # tabelas (SQLAlchemy)
│       ├── schemas/     # validação de entrada e saída (Pydantic)
│       └── routers/     # rotas: auth, workspaces, tabs, tutorials, imagens, busca
├── frontend/            # interface (React + Vite)
│   └── src/
│       ├── pages/       # telas
│       ├── components/  # componentes reutilizáveis (Modal, TutorialForm, ...)
│       ├── onboarding/  # tours guiados
│       └── services/    # api.js: todas as chamadas ao backend
├── database/
│   ├── tutorial biblioteca.sql   # schema completo (cria o banco do zero)
│   └── migrations/               # atualizações para bancos já existentes
├── LICENSE
└── README.md
```

## 🗃️ Modelo de dados

| Tabela | Descrição |
|---|---|
| `users` | Usuários (nome, e-mail, matrícula, senha em hash, tours de onboarding já vistos) |
| `workspaces` | Grupos de trabalho |
| `memberships` | Vínculo usuário ↔ workspace, com papel `admin` ou `member` |
| `tabs` | Categorias dentro de um workspace |
| `tutorials` | Tutoriais `simple` (texto corrido) ou `structured` (passo a passo) |
| `tutorial_steps` | Passos de um tutorial passo a passo |
| `tutorial_images` | Imagens de um tutorial, gerais ou ligadas a um passo |

## ⚙️ Como executar localmente

**Pré-requisitos:** MySQL 8+, Python 3.10+ e Node.js.

### 1. Banco de dados
Execute `database/tutorial biblioteca.sql` no MySQL (por exemplo, no MySQL Workbench). O script cria o banco `biblioteca_tutoriais` com todas as tabelas.

Se você já tem um banco de uma versão anterior, rode **em ordem** os scripts de `database/migrations/` que ainda não rodou.

### 2. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows (Linux/macOS: source venv/bin/activate)
pip install -r requirements.txt
```
Copie `backend/.env.example` para `backend/.env` e preencha os dados do MySQL e uma `SECRET_KEY` aleatória. Depois:
```bash
uvicorn app.main:app --reload
```
A documentação interativa da API fica em `http://127.0.0.1:8000/docs`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Acesse `http://localhost:5173` e crie uma conta pela própria tela de login.

## 🧭 Próximos passos

- Deploy de demonstração.
- Recuperação de senha e verificação de e-mail.
- Convite por link.

## 📄 Licença

Copyright © 2026 Gabriel Godoi. **Todos os direitos reservados.**

Este repositório está público **apenas para demonstração e avaliação**. Você pode visualizar o código e executá-lo localmente para avaliar o trabalho. Copiar, modificar, distribuir ou usar o código com fins comerciais **não é permitido** sem autorização por escrito. Os termos completos estão no arquivo [LICENSE](LICENSE).
