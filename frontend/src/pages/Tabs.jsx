import { useState, useEffect } from "react";
import { listTabs, createTab, updateTab, deleteTab, listTutorials, deleteTutorial } from "../services/api";
import { PlusIcon } from "../components/Icons";
import OptionsMenu from "../components/OptionsMenu";
import TutorialForm from "../components/TutorialForm";

export default function TabsPage({ user, workspace, activeTabId, onSelectTab, onOpenTutorial, onOpenMembers }) {
  const [tabs, setTabs] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [loadingTutorials, setLoadingTutorials] = useState(false);
  const [error, setError] = useState("");
  const [creatingTab, setCreatingTab] = useState(false);

  // O formulário de novo tutorial é o componente TutorialForm (o mesmo da
  // edição); aqui só controlamos se ele está aberto.
  const [showForm, setShowForm] = useState(false);

  // Papel do usuário neste workspace (vem do backend junto com o workspace).
  // Esconde os botões de criar/apagar para membros comuns; a permissão de
  // verdade continua sendo checada pelo require_admin no backend.
  const isAdmin = workspace.my_role === "admin";

  const currentTabId = activeTabId || tabs[0]?.id;

  useEffect(() => {
    loadTabs();
  }, [workspace.id]);

  useEffect(() => {
    if (currentTabId) loadTutorials(currentTabId);
    else setTutorials([]);
  }, [currentTabId]);

  function loadTabs() {
    setLoadingTabs(true);
    setError("");
    listTabs(workspace.id)
      .then(setTabs)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingTabs(false));
  }

  function loadTutorials(tabId) {
    setLoadingTutorials(true);
    listTutorials(workspace.id, tabId)
      .then(setTutorials)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingTutorials(false));
  }

  async function handleCreateTab() {
    const name = window.prompt("Nome da nova categoria:");
    if (!name) return;

    setCreatingTab(true);
    try {
      await createTab(workspace.id, name);
      loadTabs();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingTab(false);
    }
  }

  async function handleRenameTab(tab) {
    const name = window.prompt("Novo nome da categoria:", tab.name);
    if (name === null || !name.trim() || name.trim() === tab.name) return;

    try {
      // O PUT substitui todos os campos da categoria: repete descrição e
      // posição atuais para que só o nome mude.
      await updateTab(workspace.id, tab.id, {
        name: name.trim(),
        description: tab.description,
        position: tab.position,
      });
      loadTabs();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteTab(tabId) {
    if (!window.confirm("Apagar esta categoria e todos os tutoriais dentro dela?")) return;
    try {
      await deleteTab(workspace.id, tabId);
      if (tabId === currentTabId) onSelectTab(null);
      loadTabs();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteTutorial(tutorialId) {
    if (!window.confirm("Apagar este tutorial e suas imagens? Essa ação não pode ser desfeita.")) return;
    try {
      await deleteTutorial(workspace.id, currentTabId, tutorialId);
      loadTutorials(currentTabId);
    } catch (err) {
      alert(err.message);
    }
  }

  if (loadingTabs) {
    return (
      <div className="content">
        <p>Carregando categorias…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <p className="login-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="page-title">
        <h1>{workspace.name}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-new" onClick={onOpenMembers}>
            Membros
          </button>
          {isAdmin && (
            <button className="btn-new" onClick={handleCreateTab} disabled={creatingTab}>
              <PlusIcon /> {creatingTab ? "Criando…" : "Nova categoria"}
            </button>
          )}
        </div>
      </div>

      <div className="tab-row">
        {tabs.map((t) => (
          <div className="tab-pill-wrapper" key={t.id}>
            <button
              className={"tab-pill" + (t.id === currentTabId ? " active" : "")}
              onClick={() => onSelectTab(t.id)}
            >
              {t.name}
            </button>
            {isAdmin && (
              <OptionsMenu
                items={[
                  { label: "Renomear categoria", onClick: () => handleRenameTab(t) },
                  { label: "Excluir categoria", danger: true, onClick: () => handleDeleteTab(t.id) },
                ]}
              />
            )}
          </div>
        ))}
      </div>

      <div className="page-title" style={{ marginTop: "-6px" }}>
        <h1 style={{ fontSize: "15px" }}>
          Tutoriais<span className="count">{tutorials.length}</span>
        </h1>
        {isAdmin && currentTabId && (
          <button className="btn-new" onClick={() => setShowForm(true)}>
            <PlusIcon /> Novo tutorial
          </button>
        )}
      </div>

      <div className="tut-list">
        {loadingTutorials && <div className="empty-state">Carregando tutoriais…</div>}
        {!loadingTutorials && tabs.length === 0 && (
          <div className="empty-state">
            {isAdmin ? "Nenhuma categoria ainda. Crie a primeira acima." : "Nenhuma categoria ainda."}
          </div>
        )}
        {!loadingTutorials && tabs.length > 0 && tutorials.length === 0 && (
          <div className="empty-state">Nenhum tutorial nesta categoria ainda.</div>
        )}
        {!loadingTutorials &&
          tutorials.map((t) => (
            <div className="tut-row" key={t.id}>
              <button
                className="tut-row-clickable"
                onClick={() => onOpenTutorial({ ...t, tabId: currentTabId })}
              >
                <div className={"tut-icon " + t.content_type}>
                  {t.content_type === "structured" ? "≡" : "T"}
                </div>
                <div className="tut-main">
                  <div className="tut-title">{t.title}</div>
                  <div className="tut-summary">{t.summary}</div>
                </div>
              </button>
              <span className="tut-tag">{t.content_type === "structured" ? "PASSOS" : "TEXTO"}</span>
              {isAdmin && (
                <OptionsMenu
                  items={[{ label: "Excluir tutorial", danger: true, onClick: () => handleDeleteTutorial(t.id) }]}
                />
              )}
            </div>
          ))}
      </div>

      {showForm && (
        <TutorialForm
          workspaceId={workspace.id}
          tabId={currentTabId}
          tutorial={null}
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadTutorials(currentTabId);
          }}
        />
      )}
    </div>
  );
}