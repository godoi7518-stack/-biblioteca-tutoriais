/**
 * Resultados da busca global, em três grupos: Workspaces, Categorias e
 * Tutoriais. Cada tutorial mostra de onde é (workspace › categoria) e por
 * que apareceu (título, resumo, texto ou qual passo), com a palavra
 * buscada destacada — para não confundir, por exemplo, uma categoria e um
 * tutorial com o mesmo nome.
 */

import { useState, useEffect } from "react";
import { search } from "../services/api";
import { initials } from "../utils/helpers";
import { highlight } from "../utils/highlight";
import { ArrowLeftIcon, BriefcaseIcon, FolderIcon } from "../components/Icons";

const EMPTY = { workspaces: [], tabs: [], tutorials: [] };
const ROLE_LABELS = { admin: "Você é admin", member: "Você é membro" };
const MATCH_LABELS = { summary: "no resumo", content: "no texto" };

/** Frase que explica por que o tutorial apareceu. */
function matchReason(t) {
  if (t.match_in === "step") return `Encontrado no passo ${t.match_step}`;
  if (MATCH_LABELS[t.match_in]) return `Encontrado ${MATCH_LABELS[t.match_in]}`;
  return null; // achado no título: o próprio título destacado já explica
}

export default function SearchResultsPage({ query, onOpenWorkspace, onOpenTab, onOpenTutorial, onGoHome }) {
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
        .then((data) => setResults({ ...EMPTY, ...data }))
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { workspaces, tabs, tutorials } = results;
  const total = workspaces.length + tabs.length + tutorials.length;

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

      {/* Cada grupo só aparece se tiver resultado. */}
      {workspaces.length > 0 && (
        <ResultGroup title="Workspaces" count={workspaces.length}>
          {workspaces.map((ws) => (
            <button className="tut-row" key={`w${ws.id}`} onClick={() => onOpenWorkspace(ws)}>
              <div className="tut-icon workspace">{initials(ws.name)}</div>
              <div className="tut-main">
                <div className="tut-title">{highlight(ws.name, query)}</div>
                <div className="tut-summary">{ROLE_LABELS[ws.my_role] || ""}</div>
              </div>
              <span className="tut-tag">WORKSPACE</span>
            </button>
          ))}
        </ResultGroup>
      )}

      {tabs.length > 0 && (
        <ResultGroup title="Categorias" count={tabs.length}>
          {tabs.map((tab) => (
            <button className="tut-row" key={`c${tab.id}`} onClick={() => onOpenTab(tab)}>
              <div className="tut-icon category">
                <FolderIcon />
              </div>
              <div className="tut-main">
                <div className="tut-title">{highlight(tab.name, query)}</div>
                <div className="search-path">
                  <BriefcaseIcon /> {tab.workspace_name}
                </div>
              </div>
              <span className="tut-tag">CATEGORIA</span>
            </button>
          ))}
        </ResultGroup>
      )}

      {tutorials.length > 0 && (
        <ResultGroup title="Tutoriais" count={tutorials.length}>
          {tutorials.map((t) => {
            const reason = matchReason(t);
            return (
              <button className="tut-row" key={`t${t.id}`} onClick={() => onOpenTutorial(t)}>
                <div className={"tut-icon " + t.content_type}>{t.content_type === "structured" ? "≡" : "T"}</div>
                <div className="tut-main">
                  <div className="tut-title">{highlight(t.title, query)}</div>
                  {/* De onde é: workspace › categoria. */}
                  <div className="search-path">
                    <BriefcaseIcon /> {t.workspace_name} <span className="search-path-sep">›</span> <FolderIcon />{" "}
                    {t.tab_name}
                  </div>
                  {/* Por que apareceu: onde a palavra está, com o trecho. */}
                  {reason ? (
                    <div className="search-reason">
                      <span className="search-reason-label">{reason}:</span> {highlight(t.snippet || "", query)}
                    </div>
                  ) : (
                    t.summary && <div className="tut-summary">{t.summary}</div>
                  )}
                </div>
                <span className="tut-tag">{t.content_type === "structured" ? "PASSOS" : "TEXTO"}</span>
              </button>
            );
          })}
        </ResultGroup>
      )}
    </div>
  );
}

function ResultGroup({ title, count, children }) {
  return (
    <>
      <div className="page-title">
        <h1 style={{ fontSize: 15 }}>
          {title}
          <span className="count">{count}</span>
        </h1>
      </div>
      <div className="tut-list" style={{ marginBottom: 20 }}>
        {children}
      </div>
    </>
  );
}
