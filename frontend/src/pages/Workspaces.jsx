import { useState, useEffect } from "react";
import { initials } from "../utils/helpers";
import { PlusIcon } from "../components/Icons";
import OptionsMenu from "../components/OptionsMenu";
import { listWorkspaces, createWorkspace, deleteWorkspace } from "../services/api";

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

  async function handleDelete(workspaceId) {
    if (!window.confirm("Apagar este workspace? Todas as categorias, tutoriais e imagens dentro dele serão perdidos permanentemente.")) return;

    try {
      await deleteWorkspace(workspaceId);
      loadWorkspaces();
    } catch (err) {
      alert(err.message);
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
        <button className="btn-new" onClick={handleCreate} disabled={creating}>
          <PlusIcon /> {creating ? "Criando…" : "Novo workspace"}
        </button>
      </div>

      <div className="tile-grid">
        {workspaces.length === 0 && (
          <div className="empty-state">Nenhum workspace ainda. Crie o primeiro acima.</div>
        )}
        {workspaces.map((ws) => (
          <div className="tile-wrapper" key={ws.id}>
            <button className="tile" onClick={() => onOpen(ws)}>
              <div className="tile-icon">{initials(ws.name)}</div>
              <div className="tile-title">{ws.name}</div>
            </button>
            {/* Só o admin do workspace pode apagá-lo. Esconder o menu é
                conforto visual; quem barra de verdade é o require_admin. */}
            {ws.my_role === "admin" && (
              <div className="tile-menu">
                <OptionsMenu
                  items={[{ label: "Excluir workspace", danger: true, onClick: () => handleDelete(ws.id) }]}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}