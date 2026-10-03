/**
 * Página de membros de um workspace. Qualquer membro vê a lista e pode sair
 * do workspace; convidar, trocar papel e remover só aparecem para admin. O
 * papel do usuário logado vem no próprio workspace (my_role), devolvido
 * pelo backend.
 */

import { useState, useEffect } from "react";
import { listMembers, inviteMember, updateMemberRole, removeMember, leaveWorkspace } from "../services/api";
import OptionsMenu from "../components/OptionsMenu";

const ROLE_LABELS = { admin: "ADMIN", member: "MEMBRO" };

export default function MembersPage({ user, workspace, onMyRoleChanged, onLeft }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  // Erro de trocar papel / remover / sair (ex.: "O workspace precisa ter
  // pelo menos um admin."), mostrado acima da tabela.
  const [actionError, setActionError] = useState("");
  // id da membership sendo alterada agora, para travar o seletor dela
  // enquanto a requisição não volta.
  const [busyId, setBusyId] = useState(null);

  const isAdmin = workspace.my_role === "admin";

  useEffect(() => {
    loadMembers();
  }, [workspace.id]);

  function loadMembers() {
    setLoading(true);
    setError("");
    listMembers(workspace.id)
      .then(setMembers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteError("");
    setInviting(true);
    try {
      // A rota devolve o novo membro no mesmo formato da listagem, então
      // dá para só acrescentá-lo à lista sem recarregar tudo.
      const created = await inviteMember(workspace.id, inviteEmail.trim(), inviteRole);
      setMembers((prev) => [...prev, created]);
      setInviteEmail("");
      setInviteRole("member");
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(member, role) {
    const isSelf = member.user_id === user.id;
    if (isSelf && role === "member") {
      const ok = window.confirm(
        "Você deixará de ser admin deste workspace e não poderá mais criar, editar ou apagar conteúdo. Continuar?"
      );
      if (!ok) return;
    }

    setActionError("");
    setBusyId(member.id);
    try {
      const updated = await updateMemberRole(workspace.id, member.id, role);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      if (isSelf) onMyRoleChanged(updated.role);
    } catch (err) {
      // O seletor é "controlado" pelo valor da lista (que não mudou), então
      // ele volta sozinho para o papel antigo quando a troca falha.
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(member) {
    if (!window.confirm(`Remover ${member.name} deste workspace? A conta dele continua existindo.`)) return;

    setActionError("");
    try {
      await removeMember(workspace.id, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleLeave() {
    if (!window.confirm(`Sair do workspace "${workspace.name}"? Você perderá o acesso ao conteúdo dele.`)) return;

    setActionError("");
    try {
      await leaveWorkspace(workspace.id);
      onLeft();
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="content">
        <p>Carregando membros…</p>
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
          Membros<span className="count">{members.length}</span>
        </h1>
        <button className="btn-new" onClick={handleLeave}>
          Sair do workspace
        </button>
      </div>

      {isAdmin && (
        <form className="invite-form" onSubmit={handleInvite}>
          {inviteError && <div className="login-error">{inviteError}</div>}
          <div className="invite-form-row">
            <div className="field invite-form-email">
              <label htmlFor="invite-email">E-mail do usuário</label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="invite-role">Papel</label>
              <select id="invite-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button className="btn-primary invite-form-submit" disabled={inviting}>
              {inviting ? "Convidando…" : "Convidar"}
            </button>
          </div>
        </form>
      )}

      {actionError && <div className="login-error">{actionError}</div>}

      {members.length === 0 ? (
        <div className="tut-list">
          <div className="empty-state">Nenhum membro neste workspace.</div>
        </div>
      ) : (
        <table className="members-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              {isAdmin && <th className="col-actions" aria-label="Ações"></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.user_id === user.id;
              return (
                <tr key={m.id}>
                  <td>
                    {m.name}
                    {isSelf && " (você)"}
                  </td>
                  <td>{m.email}</td>
                  <td>
                    {isAdmin ? (
                      <select
                        value={m.role}
                        disabled={busyId === m.id}
                        onChange={(e) => handleRoleChange(m, e.target.value)}
                        aria-label={`Papel de ${m.name}`}
                      >
                        <option value="member">Membro</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="tut-tag">{ROLE_LABELS[m.role] || m.role}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="col-actions">
                      {/* A própria linha não tem "Remover": para isso existe
                          o botão "Sair do workspace" no topo. */}
                      {!isSelf && (
                        <OptionsMenu
                          items={[{ label: "Remover membro", danger: true, onClick: () => handleRemove(m) }]}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
