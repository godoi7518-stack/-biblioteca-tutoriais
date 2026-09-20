# Biblioteca de Tutoriais — Front-end (protótipo React)

Protótipo de interface para o projeto [biblioteca-tutoriais](https://github.com/godoi7518-stack/-biblioteca-tutoriais).
Todos os dados vêm de `src/data/mockData.js` — nada aqui depende do backend ainda.

## Rodando localmente

```bash
npm install
npm run dev
```

Contas de demonstração na tela de login: `admin/admin123` (papel admin) e `parceiro/parceiro123` (papel member).

## Estrutura

```
src/
  data/mockData.js       -> workspaces, tabs, tutorials e usuários mockados
  utils/helpers.js        -> busca em memória, formatação de iniciais
  components/
    Header.jsx            -> barra superior (busca, usuário, papel, logout)
    Breadcrumb.jsx
    MarkdownLite.jsx       -> renderiza tutoriais "simple" (**negrito**, listas)
    Icons.jsx
  pages/
    Login.jsx              -> login simulado (ponto de troca pro JWT real)
    Workspaces.jsx          -> tela de tiles dos workspaces
    Tabs.jsx                -> categorias (abas) + lista de tutoriais
    TutorialDetail.jsx      -> tutorial simple (markdown) ou structured (passos)
    SearchResults.jsx       -> resultados da busca global
  App.jsx                   -> estado de navegação entre as páginas
  styles/app.css            -> tokens de cor e todos os estilos
```

## Ligando no backend real

Os pontos marcados com comentários `MOCK` são onde entra a integração:

1. **Login** (`src/pages/Login.jsx`) — troque a busca em `USERS` por um `fetch` para o endpoint
   de autenticação (JWT) que já existe no backend, e salve o `access_token` retornado.
2. **Workspaces / Tabs / Tutorials** (`src/data/mockData.js`) — quando os endpoints de
   `workspaces`, `tabs` e `tutorials` estiverem prontos, crie um `src/services/api.js` com as
   chamadas (`fetch`/`axios`) e troque os `import { WORKSPACES } from "../data/mockData"` pelas
   chamadas equivalentes (idealmente com `useEffect` + estado de loading).
3. **Busca** (`src/utils/helpers.js`) — troque o filtro em memória por uma chamada ao endpoint
   que usa o índice `FULLTEXT` do MySQL.
4. **Papel do usuário** (`user.role`) — hoje vem do mock; deve vir do payload do JWT ou de uma
   chamada a `/me` depois do login.

Nenhuma dependência extra foi adicionada além de React — se quiser markdown completo, considere
`react-markdown`; se quiser rotas de verdade em vez do estado em `App.jsx`, considere
`react-router-dom`.
