# Biblioteca de Tutoriais — Front-end (React + Vite)

Interface do projeto [biblioteca-tutoriais](https://github.com/godoi7518-stack/-biblioteca-tutoriais).
Consome a API real do backend em `http://127.0.0.1:8000` (definida em `src/services/api.js`), então o backend precisa estar rodando.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` e entre com o e-mail e a senha de um usuário cadastrado no banco.

## Estrutura

```
src/
  App.jsx                 -> componente raiz; navegação por estado (view.page), sem react-router
  services/api.js         -> única porta de saída HTTP (apiFetch + uma função por rota)
  utils/helpers.js        -> iniciais do nome, detecção de passos numerados em texto
  styles/app.css          -> estilos e variáveis de cor (:root)
  components/
    Header.jsx            -> barra superior (busca, usuário, logout)
    Breadcrumb.jsx
    AccordionSteps.jsx    -> passos em lista expansível (com imagens por passo)
    ImageLightbox.jsx     -> imagem em tela cheia com navegação
    MarkdownLite.jsx      -> renderiza tutoriais "simple" (**negrito**, listas)
    OptionsMenu.jsx       -> menu "⋮" de ações
    Icons.jsx
  pages/
    Login.jsx             -> login com JWT (e-mail + senha)
    Workspaces.jsx        -> tiles dos workspaces
    Tabs.jsx              -> categorias (abas) + lista de tutoriais
    TutorialDetail.jsx    -> tutorial simple (texto) ou structured (passos) + imagens
    SearchResults.jsx     -> busca em todos os workspaces do usuário
    Members.jsx           -> membros do workspace (listar; convidar, se admin)
```
