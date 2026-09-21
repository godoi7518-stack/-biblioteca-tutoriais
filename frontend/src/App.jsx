/**
 * Componente raiz. Controla qual "página" é exibida via um objeto de
 * estado (view), sem usar react-router — decisão deliberada para manter
 * simples enquanto o projeto ainda está em desenvolvimento.
 */

import { useState, useEffect } from "react";
import { getCurrentUser } from "./services/api";
import Header from "./components/Header";
import Breadcrumb from "./components/Breadcrumb";
import Login from "./pages/Login";
import WorkspacesPage from "./pages/Workspaces";
import TabsPage from "./pages/Tabs";
import TutorialDetailPage from "./pages/TutorialDetail";
import SearchResultsPage from "./pages/SearchResults";
import "./styles/app.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [view, setView] = useState({ page: "workspaces" });
  const [searchQuery, setSearchQuery] = useState("");

  // Ao carregar a página, valida a sessão a partir do token salvo (não do
  // usuário salvo cru) — assim, se o token expirou, GET /auth/me falha e a
  // sessão local é limpa, voltando pra tela de login. checkingAuth evita
  // mostrar a tela de login "piscando" antes de confirmar se já existe
  // uma sessão válida.
  useEffect(() => {
    const token = localStorage.getItem("bt_token");
    if (!token) {
      setCheckingAuth(false);
      return;
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("bt_token");
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  function handleLogin(u) {
    setUser(u);
  }

  function handleLogout() {
    setUser(null);
    setView({ page: "workspaces" });
    setSearchQuery("");
    localStorage.removeItem("bt_token");
  }

   if (checkingAuth) {
    return null;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isSearching = searchQuery.trim().length > 0;

  const crumbs = [{ label: "Workspaces", page: "workspaces" }];
  if (view.workspace) crumbs.push({ label: view.workspace.name, page: "tabs", workspace: view.workspace });
  if (view.tutorial) crumbs.push({ label: view.tutorial.title, page: "tutorial" });

  function navigate(item) {
    setSearchQuery("");
    if (item.page === "workspaces") setView({ page: "workspaces" });
    else if (item.page === "tabs") setView({ page: "tabs", workspace: item.workspace, tabId: view.tabId });
  }

  return (
    <div>
      <Header user={user} onLogout={handleLogout} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {!isSearching && <Breadcrumb items={crumbs} onNavigate={navigate} />}

      {isSearching ? (
        <SearchResultsPage
          query={searchQuery}
          onOpenTutorial={(t) => {
            setSearchQuery("");
            // O resultado da busca traz workspace_id/workspace_name em vez
            // de um objeto workspace pronto (a busca cruza vários
            // workspaces, não só o que estava aberto) — monta o objeto
            // aqui para manter o mesmo formato usado no resto do app.
            setView({
              page: "tutorial",
              tutorial: t,
              workspace: { id: t.workspace_id, name: t.workspace_name },
              tabId: t.tab_id,
            });
          }}
        />
      ) : view.page === "workspaces" ? (
        <WorkspacesPage user={user} onOpen={(ws) => setView({ page: "tabs", workspace: ws })} />
      ) : view.page === "tabs" ? (
        <TabsPage
          user={user}
          workspace={view.workspace}
          activeTabId={view.tabId}
          onSelectTab={(tabId) => setView({ ...view, tabId })}
          onOpenTutorial={(t) => setView({ page: "tutorial", tutorial: t, workspace: view.workspace, tabId: t.tabId })}
        />
      ) : view.page === "tutorial" ? (
        <TutorialDetailPage
          workspace={view.workspace}
          tabId={view.tabId}
          tutorialId={view.tutorial.id}
          initialTutorial={view.tutorial}
        />
      ) : null}
    </div>
  );
}