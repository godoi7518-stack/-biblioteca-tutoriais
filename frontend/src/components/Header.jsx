/**
 * Barra superior fixa: nome do site (volta ao início), busca global, selo
 * do papel no workspace aberto, ajuda ("?", reabre o tour da tela), botão
 * de tema claro/escuro, usuário e Sair. Os data-tour marcam elementos que o
 * tour de onboarding destaca.
 *
 * Em tela estreita (celular) a busca desce para uma segunda linha — ver
 * .shell-header no app.css.
 */

import { SearchIcon, SunIcon, MoonIcon } from "./Icons";
import { initials } from "../utils/helpers";
import { useTheme } from "../utils/theme";
import { APP_NAME } from "../config/brand";

const ROLE_LABELS = { admin: "ADMIN", member: "MEMBRO" };

export default function Header({ user, role, onLogout, onGoHome, onHelp, searchQuery, onSearchChange }) {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro";

  return (
    <header className="shell-header">
      <button className="app-name" onClick={onGoHome} title="Ir para o início">
        {APP_NAME}
      </button>

      <div className="header-search" data-tour="search">
        <SearchIcon />
        <input
          type="search"
          placeholder="Buscar tutoriais, categorias e workspaces…"
          aria-label="Buscar tutoriais, categorias e workspaces"
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
        {/* Só aparece em telas que têm tour (não na busca). */}
        {onHelp && (
          <button className="help-button" onClick={onHelp} title="Ver dicas desta tela" aria-label="Ver dicas desta tela" data-tour="help">
            ?
          </button>
        )}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={nextThemeLabel}
          aria-label={nextThemeLabel}
          data-tour="theme"
        >
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
