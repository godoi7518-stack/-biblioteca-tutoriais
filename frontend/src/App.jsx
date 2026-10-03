/**
 * Componente raiz. Controla qual "página" é exibida via um objeto de
 * estado (view), sem usar react-router — decisão deliberada para manter
 * simples enquanto o projeto ainda está em desenvolvimento.
 */

import { useState, useEffect } from "react";
import { getCurrentUser, markOnboardingSeen } from "./services/api";
import Header from "./components/Header";
import Breadcrumb from "./components/Breadcrumb";
import { GridIcon, BriefcaseIcon, FolderIcon, DocumentIcon, UsersIcon } from "./components/Icons";
import Login from "./pages/Login";
import WorkspacesPage from "./pages/Workspaces";
import TabsPage from "./pages/Tabs";
import TutorialDetailPage from "./pages/TutorialDetail";
import SearchResultsPage from "./pages/SearchResults";
import MembersPage from "./pages/Members";
import Tour from "./onboarding/Tour";
import { TOURS, tourKeyFor } from "./onboarding/tours";
import { OnboardingContext } from "./onboarding/OnboardingContext";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [view, setView] = useState({ page: "workspaces" });
  const [searchQuery, setSearchQuery] = useState("");
  // Tour de onboarding aberto agora (chave de TOURS) e um contador para
  // reiniciar o tour do zero quando o usuário clica em "?" de novo.
  const [activeTour, setActiveTour] = useState(null);
  const [tourRun, setTourRun] = useState(0);

  const isSearching = searchQuery.trim().length > 0;
  const currentTourKey = !isSearching ? tourKeyFor(view.page, view.workspace?.my_role) : null;

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

  // Abre sozinho o tour da tela na primeira vez que o usuário a visita (por
  // papel). "Já visto" vem do backend (user.onboarding_seen), então vale em
  // qualquer computador.
  useEffect(() => {
    if (!user || !currentTourKey || activeTour) return;
    if ((user.onboarding_seen || []).includes(currentTourKey)) return;
    setActiveTour(currentTourKey);
  }, [user, currentTourKey]);

  /** Marca um tour como visto: atualiza na hora (para não reabrir) e avisa
      o backend; se a chamada falhar, o pior caso é o tour aparecer de novo
      no próximo acesso. */
  function markTourSeen(key) {
    if (!key || (user?.onboarding_seen || []).includes(key)) return;
    setUser((u) => ({ ...u, onboarding_seen: [...(u.onboarding_seen || []), key] }));
    markOnboardingSeen(key).catch(() => {});
  }

  // Disponível para qualquer componente via useOnboarding() (ex.: o
  // mini-tour do formulário de tutorial).
  const onboardingApi = {
    hasSeen: (key) => (user?.onboarding_seen || []).includes(key),
    markSeen: markTourSeen,
  };

  /** Fechou o tour (concluiu, pulou ou Esc): marca como visto. */
  function closeTour() {
    const key = activeTour;
    setActiveTour(null);
    markTourSeen(key);
  }

  function openHelp() {
    setTourRun((n) => n + 1);
    setActiveTour(currentTourKey);
  }

  function handleLogin(u) {
    setUser(u);
  }

  function handleLogout() {
    setUser(null);
    setView({ page: "workspaces" });
    setSearchQuery("");
    setActiveTour(null);
    localStorage.removeItem("bt_token");
  }

  if (checkingAuth) {
    return null;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  function goHome() {
    setSearchQuery("");
    setView({ page: "workspaces" });
  }

  // Trilha do breadcrumb: Workspaces › Workspace › Categoria › Tutorial (ou
  // › Membros). O último item é a tela atual.
  const crumbs = [{ label: "Workspaces", icon: GridIcon, onClick: goHome }];
  if (view.workspace) {
    crumbs.push({
      label: view.workspace.name,
      icon: BriefcaseIcon,
      onClick: () => setView({ page: "tabs", workspace: view.workspace, tabId: view.tabId }),
    });
  }
  if (view.page === "tutorial") {
    if (view.tabName) {
      crumbs.push({
        label: view.tabName,
        icon: FolderIcon,
        onClick: () => setView({ page: "tabs", workspace: view.workspace, tabId: view.tabId }),
      });
    }
    crumbs.push({ label: view.tutorial.title, icon: DocumentIcon });
  }
  if (view.page === "members") crumbs.push({ label: "Membros", icon: UsersIcon });

  return (
    <OnboardingContext.Provider value={onboardingApi}>
      <Header
        user={user}
        // Papel no workspace aberto (selo ADMIN/MEMBRO); fora de um
        // workspace não há papel a mostrar.
        role={!isSearching ? view.workspace?.my_role : null}
        onLogout={handleLogout}
        onGoHome={goHome}
        onHelp={currentTourKey ? openHelp : null}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {!isSearching && <Breadcrumb items={crumbs} />}

      {isSearching ? (
        <SearchResultsPage
          query={searchQuery}
          // "Início" é a tela de Workspaces: limpa a busca (o que esconde
          // os resultados) e reseta a navegação.
          onGoHome={goHome}
          // Workspace achado pela busca já vem no mesmo formato da lista de
          // workspaces (inclusive my_role), então abre direto.
          onOpenWorkspace={(ws) => {
            setSearchQuery("");
            setView({ page: "tabs", workspace: ws });
          }}
          onOpenTutorial={(t) => {
            setSearchQuery("");
            // O resultado da busca traz workspace_id/workspace_name em vez
            // de um objeto workspace pronto (a busca cruza vários
            // workspaces, não só o que estava aberto) — monta o objeto
            // aqui para manter o mesmo formato usado no resto do app,
            // incluindo o papel (my_role), que decide os botões de admin.
            setView({
              page: "tutorial",
              tutorial: t,
              workspace: { id: t.workspace_id, name: t.workspace_name, my_role: t.workspace_role },
              tabId: t.tab_id,
              tabName: t.tab_name,
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
          onOpenTutorial={(t) =>
            setView({ page: "tutorial", tutorial: t, workspace: view.workspace, tabId: t.tabId, tabName: t.tabName })
          }
          // Guarda o tabId para que, ao voltar pelo breadcrumb, a mesma
          // categoria continue selecionada.
          onOpenMembers={() => setView({ page: "members", workspace: view.workspace, tabId: view.tabId })}
        />
      ) : view.page === "tutorial" ? (
        <TutorialDetailPage
          user={user}
          workspace={view.workspace}
          tabId={view.tabId}
          tutorialId={view.tutorial.id}
          initialTutorial={view.tutorial}
          onDeleted={() => setView({ page: "tabs", workspace: view.workspace, tabId: view.tabId })}
          // Depois de editar, guarda o título novo para o breadcrumb.
          onUpdated={(saved) => setView({ ...view, tutorial: { ...view.tutorial, title: saved.title } })}
        />
      ) : view.page === "members" ? (
        <MembersPage
          user={user}
          workspace={view.workspace}
          // Se o usuário trocou o PRÓPRIO papel, o my_role guardado no view
          // ficou velho: atualiza para os botões de admin das outras telas
          // aparecerem/sumirem certo ao voltar pelo breadcrumb.
          onMyRoleChanged={(role) => setView({ ...view, workspace: { ...view.workspace, my_role: role } })}
          // Saiu do workspace: não tem mais acesso a ele, volta para a lista.
          onLeft={() => setView({ page: "workspaces" })}
        />
      ) : null}

      {activeTour && TOURS[activeTour] && (
        <Tour key={`${activeTour}-${tourRun}`} steps={TOURS[activeTour]} onClose={closeTour} />
      )}
    </OnboardingContext.Provider>
  );
}