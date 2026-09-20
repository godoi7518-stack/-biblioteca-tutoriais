import { useMemo } from "react";
import { searchTutorials } from "../utils/helpers";

export default function SearchResultsPage({ query, onOpenTutorial }) {
  const results = useMemo(() => searchTutorials(query), [query]);

  return (
    <div className="content">
      <div className="page-title">
        <h1>Resultados da busca</h1>
      </div>
      <p className="search-results-note">
        {results.length} resultado(s) para "{query}"
      </p>
      <div className="tut-list">
        {results.length === 0 && <div className="empty-state">Nada encontrado. Tente outro termo.</div>}
        {results.map((t) => (
          <button className="tut-row" key={t.id} onClick={() => onOpenTutorial(t)}>
            <div className={"tut-icon " + t.type}>{t.type === "structured" ? "≡" : "T"}</div>
            <div className="tut-main">
              <div className="tut-title">{t.title}</div>
              <div className="tut-summary">{t.summary}</div>
            </div>
            <span className="tut-tag">{t.type === "structured" ? "PASSOS" : "TEXTO"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
