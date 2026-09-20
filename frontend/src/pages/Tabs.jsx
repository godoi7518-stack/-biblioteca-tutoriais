import { useState, useEffect } from "react";
import { listTabs, createTab, listTutorials, createTutorial } from "../services/api";
import { PlusIcon } from "../components/Icons";

export default function TabsPage({ user, workspace, activeTabId, onSelectTab, onOpenTutorial }) {
  const [tabs, setTabs] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [loadingTutorials, setLoadingTutorials] = useState(false);
  const [error, setError] = useState("");
  const [creatingTab, setCreatingTab] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  function openNewTutorialForm() {
    setFormTitle("");
    setFormSummary("");
    setFormContent("");
    setFormError("");
    setShowForm(true);
  }

  async function handleCreateTutorial(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await createTutorial(workspace.id, currentTabId, {
        title: formTitle,
        summary: formSummary || null,
        content_type: "simple",
        content: formContent,
      });
      setShowForm(false);
      loadTutorials(currentTabId);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
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
        <button className="btn-new" onClick={handleCreateTab} disabled={creatingTab}>
          <PlusIcon /> {creatingTab ? "Criando…" : "Nova categoria"}
        </button>
      </div>

      <div className="tab-row">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={"tab-pill" + (t.id === currentTabId ? " active" : "")}
            onClick={() => onSelectTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="page-title" style={{ marginTop: "-6px" }}>
        <h1 style={{ fontSize: "15px" }}>
          Tutoriais<span className="count">{tutorials.length}</span>
        </h1>
        {currentTabId && (
          <button className="btn-new" onClick={openNewTutorialForm}>
            <PlusIcon /> Novo tutorial
          </button>
        )}
      </div>

      <div className="tut-list">
        {loadingTutorials && <div className="empty-state">Carregando tutoriais…</div>}
        {!loadingTutorials && tabs.length === 0 && (
          <div className="empty-state">Nenhuma categoria ainda. Crie a primeira acima.</div>
        )}
        {!loadingTutorials && tabs.length > 0 && tutorials.length === 0 && (
          <div className="empty-state">Nenhum tutorial nesta categoria ainda.</div>
        )}
        {!loadingTutorials &&
          tutorials.map((t) => (
            <button
              className="tut-row"
              key={t.id}
              onClick={() => onOpenTutorial({ ...t, tabId: currentTabId })}
            >
              <div className={"tut-icon " + t.content_type}>
                {t.content_type === "structured" ? "≡" : "T"}
              </div>
              <div className="tut-main">
                <div className="tut-title">{t.title}</div>
                <div className="tut-summary">{t.summary}</div>
              </div>
              <span className="tut-tag">{t.content_type === "structured" ? "PASSOS" : "TEXTO"}</span>
            </button>
          ))}
      </div>

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="login-card"
            style={{ maxWidth: 480, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 16 }}>Novo tutorial</h2>

            {formError && <div className="login-error">{formError}</div>}

            <form onSubmit={handleCreateTutorial}>
              <div className="field">
                <label htmlFor="tut-title">Título</label>
                <input
                  id="tut-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="tut-summary">Resumo (opcional)</label>
                <input
                  id="tut-summary"
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="tut-content">Conteúdo</label>
                <textarea
                  id="tut-content"
                  rows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn-new"
                  style={{ flex: 1 }}
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
                <button className="btn-primary" style={{ flex: 1, marginTop: 0 }} disabled={submitting}>
                  {submitting ? "Salvando…" : "Criar tutorial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}