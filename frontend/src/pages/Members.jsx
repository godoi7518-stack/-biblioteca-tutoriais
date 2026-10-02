/**
 * Página de membros de um workspace. Qualquer membro vê a lista; o
 * formulário de convite só aparece para admin. O papel do usuário logado é
 * descoberto pela própria lista de membros (não há outra rota para isso).
 */

import { useState, useEffect } from "react";
import { listMembers, inviteMember } from "../services/api";

const ROLE_LABELS = { admin: "ADMIN", member: "MEMBRO" };

export default function MembersPage({ user, workspace }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteError, setInviteError] = useState("");
  const [inviting, setInviting] = useState(false);

  const isAdmin = members.find((m) => m.user_id === user.id)?.role === "admin";

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
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td>
                  <span className="tut-tag">{ROLE_LABELS[m.role] || m.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
