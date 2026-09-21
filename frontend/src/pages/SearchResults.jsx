import { useState, useEffect } from "react";
import { searchTutorials } from "../services/api";

export default function SearchResultsPage({ query, onOpenTutorial }) {
  const [results, setResults] = useState([]);
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
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchTutorials(trimmed)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="content">
      <div className="page-title">
        <h1>Resultados da busca</h1>
      </div>
      <p className="search-results-note">
        {loading ? "Buscando…" : `${results.length} resultado(s) para "${query}"`}
      </p>
      <div className="tut-list">
        {!loading && results.length === 0 && (
          <div className="empty-state">Nada encontrado. Tente outro termo.</div>
        )}
        {results.map((t) => (
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
    </div>
  );
}