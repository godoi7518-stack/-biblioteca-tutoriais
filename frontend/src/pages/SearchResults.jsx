import { useState, useEffect } from "react";
import { search } from "../services/api";
import { initials } from "../utils/helpers";
import { ArrowLeftIcon } from "../components/Icons";

const EMPTY = { workspaces: [], tutorials: [] };
const ROLE_LABELS = { admin: "Você é admin", member: "Você é membro" };

export default function SearchResultsPage({ query, onOpenWorkspace, onOpenTutorial, onGoHome }) {
  const [results, setResults] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  /**
   * Debounce de 300ms: espera o usuário parar de digitar antes de buscar,
   * em vez de disparar uma requisição a cada tecla. O cleanup do
   * useEffect (return () => clearTimeout) cancela o timer anterior toda
   * vez que query muda — é isso que faz o debounce funcionar.
   */
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      search(trimmed)
        .then(setResults)
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { workspaces, tutorials } = results;
  const total = workspaces.length + tutorials.length;

  return (
    <div className="content">
      <div className="page-title">
        <h1>Resultados da busca</h1>
        <button className="btn-new" onClick={onGoHome}>
          <ArrowLeftIcon /> Voltar ao início
        </button>
      </div>
      <p className="search-results-note">
        {loading ? "Buscando…" : `${total} resultado(s) para "${query}"`}
      </p>

      {!loading && total === 0 && (
        <div className="tut-list">
          <div className="empty-state">Nada encontrado. Tente outro termo.</div>
        </div>
      )}

      {/* Cada grupo só aparece se tiver resultado, para não mostrar um
          título "Workspaces 0" vazio no meio da tela. */}
      {workspaces.length > 0 && (
        <>
          <div className="page-title">
            <h1 style={{ fontSize: 15 }}>
              Workspaces<span className="count">{workspaces.length}</span>
            </h1>
          </div>
          <div className="tut-list" style={{ marginBottom: 20 }}>
            {workspaces.map((ws) => (
              <button className="tut-row" key={ws.id} onClick={() => onOpenWorkspace(ws)}>
                <div className="tut-icon workspace">{initials(ws.name)}</div>
                <div className="tut-main">
                  <div className="tut-title">{ws.name}</div>
                  <div className="tut-summary">{ROLE_LABELS[ws.my_role] || ""}</div>
                </div>
                <span className="tut-tag">WORKSPACE</span>
              </button>
            ))}
          </div>
        </>
      )}

      {tutorials.length > 0 && (
        <>
          <div className="page-title">
            <h1 style={{ fontSize: 15 }}>
              Tutoriais<span className="count">{tutorials.length}</span>
            </h1>
          </div>
          <div className="tut-list">
            {tutorials.map((t) => (
              <button className="tut-row" key={t.id} onClick={() => onOpenTutorial(t)}>
                <div className={"tut-icon " + t.content_type}>
                  {t.content_type === "structured" ? "≡" : "T"}
                </div>
                <div className="tut-main">
                  <div className="tut-title">{t.title}</div>
                  {/* A busca cruza vários workspaces, então mostra de onde
                      cada resultado veio (workspace/tab), não só o resumo. */}
                  <div className="tut-summary">
                    {t.workspace_name} / {t.tab_name}
                    {t.summary ? " — " + t.summary : ""}
                  </div>
                </div>
                <span className="tut-tag">{t.content_type === "structured" ? "PASSOS" : "TEXTO"}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
