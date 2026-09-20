import { SearchIcon } from "./Icons";
import { initials } from "../utils/helpers";

export default function Header({ user, onLogout, searchQuery, onSearchChange }) {
  return (
    <header className="shell-header">
      <div className="left">
        <span className="app-name">
          Biblioteca de Tutoriais<span className="dim">protótipo</span>
        </span>
      </div>

      <div className="header-search">
        <SearchIcon />
        <input
          placeholder="Buscar em todos os tutoriais…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="right">
        {user.role && (
  <span className={"role-badge" + (user.role === "admin" ? " admin" : "")}>
    {user.role === "admin" ? "ADMIN" : "MEMBRO"}
  </span>
)}
        <div className="user-chip">
          <div className="avatar">{initials(user.name)}</div>
          <span>{user.name}</span>
        </div>
        <button className="logout-link" onClick={onLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}
