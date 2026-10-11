import { useState, useEffect } from "react";
import { initials } from "../utils/helpers";
import { PlusIcon } from "../components/Icons";
import OptionsMenu from "../components/OptionsMenu";
import { listWorkspaces, createWorkspace, renameWorkspace, deleteWorkspace } from "../services/api";
import { useDialog } from "../components/DialogProvider";

export default function WorkspacesPage({ user, onOpen }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const dialog = useDialog();

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
    const name = await dialog.prompt({
      title: "Novo workspace",
      label: "Nome do workspace",
      placeholder: "Ex.: Equipe de Inventário",
      maxLength: 150,
      confirmLabel: "Criar workspace",
    });
    if (!name) return;

    setCreating(true);
    try {
      await createWorkspace(name);
      loadWorkspaces();
    } catch (err) {
      dialog.alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(ws) {
    const name = await dialog.prompt({
      title: "Renomear workspace",
      label: "Nome do workspace",
      defaultValue: ws.name,
      maxLength: 150,
      confirmLabel: "Salvar",
    });
    // O prompt já tira espaços das pontas e não deixa confirmar vazio.
    if (!name || name === ws.name) return;

    try {
      const updated = await renameWorkspace(ws.id, name);
      // Troca só o workspace renomeado na lista, sem recarregar tudo.
      setWorkspaces((list) => list.map((w) => (w.id === updated.id ? updated : w)));
    } catch (err) {
      dialog.alert(err.message);
    }
  }

  async function handleDelete(workspaceId) {
    const ok = await dialog.confirm({
      title: "Apagar workspace",
      message: "Todas as categorias, tutoriais e imagens dentro dele serão perdidos permanentemente.",
      confirmLabel: "Apagar workspace",
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteWorkspace(workspaceId);
      loadWorkspaces();
    } catch (err) {
      dialog.alert(err.message);
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
    // data-tour-ready / data-tour: marcadores do onboarding (src/onboarding).
    <div className="content" data-tour-ready>
      <div className="page-title">
        <h1>
          Workspaces<span className="count">{workspaces.length}</span>
        </h1>
        <button className="btn-new" onClick={handleCreate} disabled={creating} data-tour="ws-new">
          <PlusIcon /> {creating ? "Criando…" : "Novo workspace"}
        </button>
      </div>

      <div className="tile-grid" data-tour={workspaces.length > 0 ? "ws-list" : undefined}>
        {workspaces.length === 0 && (
          <div className="empty-state" data-tour="ws-empty">
            Nenhum workspace ainda. Crie o primeiro acima.
          </div>
        )}
        {workspaces.map((ws) => (
          <div className="tile-wrapper" key={ws.id}>
            <button className="tile" onClick={() => onOpen(ws)}>
              <div className="tile-icon">{initials(ws.name)}</div>
              <div className="tile-title">{ws.name}</div>
            </button>
            {/* Só o admin do workspace pode renomeá-lo ou apagá-lo. Esconder
                o menu é conforto visual; quem barra de verdade é o require_admin. */}
            {ws.my_role === "admin" && (
              <div className="tile-menu">
                <OptionsMenu
                  items={[
                    { label: "Renomear workspace", onClick: () => handleRename(ws) },
                    { label: "Excluir workspace", danger: true, onClick: () => handleDelete(ws.id) },
                  ]}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}