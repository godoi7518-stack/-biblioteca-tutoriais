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
  const [view, setView] = useState({ page: "workspaces" });
  const [searchQuery, setSearchQuery] = useState("");

  // checagem do token JWT salvo.
    useEffect(() => {
    const token = localStorage.getItem("bt_token");
    if (!token) return;

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("bt_token");
      });
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
            setView({ page: "tutorial", tutorial: t, workspace: view.workspace, tabId: t.tabId });
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
        <TutorialDetailPage tutorial={view.tutorial} />
      ) : null}
    </div>
  );
}
