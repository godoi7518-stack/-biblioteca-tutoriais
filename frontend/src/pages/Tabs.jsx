import { useState, useEffect } from "react";
import { listTabs, createTab, deleteTab, listTutorials, createTutorial, addStep, uploadImage, deleteTutorial } from "../services/api";
import { PlusIcon } from "../components/Icons";
import OptionsMenu from "../components/OptionsMenu";

export default function TabsPage({ user, workspace, activeTabId, onSelectTab, onOpenTutorial }) {
  const [tabs, setTabs] = useState([]);
  const [tutorials, setTutorials] = useState([]);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [loadingTutorials, setLoadingTutorials] = useState(false);
  const [error, setError] = useState("");
  const [creatingTab, setCreatingTab] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("simple"); // "simple" | "structured"
  const [formTitle, setFormTitle] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formSteps, setFormSteps] = useState([{ title: "", content: "", is_critical: false }]);
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

  function openNewTutorialForm() {
    setFormType("simple");
    setFormTitle("");
    setFormSummary("");
    setFormContent("");
    setFormSteps([{ title: "", content: "", is_critical: false, image: null }]);
    setFormError("");
    setShowForm(true);
  }

  function addStepField() {
  setFormSteps((prev) => [...prev, { title: "", content: "", is_critical: false, image: null }]);
}

  function removeStepField(index) {
    setFormSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStepField(index, field, value) {
    setFormSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  async function handleCreateTutorial(e) {
    e.preventDefault();
    setFormError("");

    if (formType === "structured") {
      const incomplete = formSteps.some((s) => !s.title.trim() || !s.content.trim());
      if (incomplete || formSteps.length === 0) {
        setFormError("Preencha título e conteúdo de todos os passos (ou remova os vazios).");
        return;
      }
    }

    setSubmitting(true);
    let createdTutorial = null;
    try {
      createdTutorial = await createTutorial(workspace.id, currentTabId, {
        title: formTitle,
        summary: formSummary || null,
        content_type: formType,
        content: formType === "simple" ? formContent : null,
      });

      if (formType === "structured") {
                for (let i = 0; i < formSteps.length; i++) {
          const s = formSteps[i];
          const createdStep = await addStep(workspace.id, currentTabId, createdTutorial.id, {
            step_number: i + 1,
            title: s.title,
            content: s.content,
            is_critical: s.is_critical,
          });
          if (s.image) {
            await uploadImage(workspace.id, currentTabId, createdTutorial.id, s.image, null, createdStep.id);
          }
        }
      }

      setShowForm(false);
      loadTutorials(currentTabId);
    } catch (err) {
      if (createdTutorial) {
        try {
          await deleteTutorial(workspace.id, currentTabId, createdTutorial.id);
        } catch (cleanupErr) {
          // Se nem a limpeza funcionar, o usuário verá o tutorial incompleto
          // na lista e poderá apagar manualmente.
        }
      }
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
          <div className="tab-pill-wrapper" key={t.id}>
            <button
              className={"tab-pill" + (t.id === currentTabId ? " active" : "")}
              onClick={() => onSelectTab(t.id)}
            >
              {t.name}
            </button>
            <OptionsMenu
              items={[{ label: "Excluir categoria", danger: true, onClick: () => handleDeleteTab(t.id) }]}
            />
          </div>
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
              <OptionsMenu
                items={[{ label: "Excluir tutorial", danger: true, onClick: () => handleDeleteTutorial(t.id) }]}
              />
            </div>
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
            padding: 24,
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            className="login-card"
            style={{ maxWidth: 560, width: "100%", maxHeight: "85vh", overflowY: "auto" }}
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
                <label>Tipo de tutorial</label>
                <div className="type-toggle">
                  <button
                    type="button"
                    className={"type-toggle-btn" + (formType === "simple" ? " active" : "")}
                    onClick={() => setFormType("simple")}
                  >
                    Texto corrido
                  </button>
                  <button
                    type="button"
                    className={"type-toggle-btn" + (formType === "structured" ? " active" : "")}
                    onClick={() => setFormType("structured")}
                  >
                    Passo a passo
                  </button>
                </div>
              </div>

              {formType === "simple" ? (
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
              ) : (
                <div className="field">
                  <label>Passos</label>
                  {formSteps.map((step, i) => (
                    <div className="step-builder" key={i}>
                      <div className="step-builder-header">
                        <span className="step-builder-num">Passo {i + 1}</span>
                        {formSteps.length > 1 && (
                          <button
                            type="button"
                            className="step-builder-remove"
                            onClick={() => removeStepField(i)}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <input
                        placeholder="Título do passo"
                        value={step.title}
                        onChange={(e) => updateStepField(i, "title", e.target.value)}
                        style={{ marginBottom: 8 }}
                      />
                      <textarea
                        placeholder="O que deve ser feito neste passo"
                        rows={3}
                        value={step.content}
                        onChange={(e) => updateStepField(i, "content", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "9px 10px",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                          background: "var(--bg)",
                          color: "var(--text)",
                          fontSize: 13,
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                      <label className="step-critical-toggle">
                        <input
                          type="checkbox"
                          checked={step.is_critical}
                          onChange={(e) => updateStepField(i, "is_critical", e.target.checked)}
                        />
                        Marcar como etapa crítica
                      </label>
                      <label className="step-image-upload">
                        <span>Imagem do passo (opcional)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => updateStepField(i, "image", e.target.files[0] || null)}
                        />
                        {step.image && <span className="step-image-filename">{step.image.name}</span>}
                      </label>
                    </div>
                  ))}
                  <button type="button" className="btn-new" onClick={addStepField} style={{ marginTop: 4 }}>
                    <PlusIcon /> Adicionar passo
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
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