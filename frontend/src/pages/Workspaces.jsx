import { useState, useEffect } from "react";
import { listWorkspaces, createWorkspace } from "../services/api";
import { initials } from "../utils/helpers";
import { PlusIcon } from "../components/Icons";

export default function WorkspacesPage({ user, onOpen }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  function loadWorkspaces() {
    setLoading(true);
    setError("");
    listWorkspaces()
      .then(setWorkspaces)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  // Usa window.prompt() por simplicidade — funcional, mas destoa do resto
  // da UI. Trocar por um modal de verdade é melhoria de polimento pendente.
  async function handleCreate() {
    const name = window.prompt("Nome do novo workspace:");
    if (!name) return;

    setCreating(true);
    try {
      await createWorkspace(name);
      loadWorkspaces();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="content">
        <p>Carregando workspaces…</p>
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
        <h1>
          Workspaces<span className="count">{workspaces.length}</span>
        </h1>
        {/* Qualquer usuário logado pode criar workspace no backend — sem
            checagem de papel aqui, porque quem cria vira admin dele. */}
        <button className="btn-new" onClick={handleCreate} disabled={creating}>
          <PlusIcon /> {creating ? "Criando…" : "Novo workspace"}
        </button>
      </div>

      <div className="tile-grid">
        {workspaces.length === 0 && (
          <div className="empty-state">Nenhum workspace ainda. Crie o primeiro acima.</div>
        )}
        {workspaces.map((ws) => (
          <button className="tile" key={ws.id} onClick={() => onOpen(ws)}>
            <div className="tile-icon">{initials(ws.name)}</div>
            <div className="tile-title">{ws.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}