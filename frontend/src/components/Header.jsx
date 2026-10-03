/**
 * Barra superior fixa: nome do site (volta ao início), busca global, selo
 * do papel no workspace aberto, botão de tema claro/escuro, usuário e Sair.
 *
 * Em tela estreita (celular) a busca desce para uma segunda linha — ver
 * .shell-header no app.css.
 */

import { SearchIcon, SunIcon, MoonIcon } from "./Icons";
import { initials } from "../utils/helpers";
import { useTheme } from "../utils/theme";

const ROLE_LABELS = { admin: "ADMIN", member: "MEMBRO" };

export default function Header({ user, role, onLogout, onGoHome, searchQuery, onSearchChange }) {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro";

  return (
    <header className="shell-header">
      <button className="app-name" onClick={onGoHome} title="Ir para o início">
        Biblioteca de Tutoriais
      </button>

      <div className="header-search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Buscar workspaces e tutoriais…"
          aria-label="Buscar workspaces e tutoriais"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="header-right">
        {/* O papel é por workspace (não por usuário), por isso o selo só
            aparece com um workspace aberto. */}
        {role && (
          <span className={"role-badge" + (role === "admin" ? " admin" : "")} title="Seu papel neste workspace">
            {ROLE_LABELS[role] || role}
          </span>
        )}
        <button className="theme-toggle" onClick={toggleTheme} title={nextThemeLabel} aria-label={nextThemeLabel}>
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="user-chip" title={user.email}>
          <div className="avatar">{initials(user.name)}</div>
          <span className="user-name">{user.name}</span>
        </div>
        <button className="logout-link" onClick={onLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}
