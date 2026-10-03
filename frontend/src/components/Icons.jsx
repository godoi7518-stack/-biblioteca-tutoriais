/**
 * Ícones em SVG usados pelo site (sem biblioteca externa). Todos usam
 * stroke="currentColor", então herdam a cor do texto onde são colocados —
 * funcionam no modo claro e no escuro sem ajuste.
 *
 * Icon é a "moldura" comum; cada ícone só descreve as formas de dentro.
 */

function Icon({ size = 16, strokeWidth = 2, className, children }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SearchIcon() {
  return (
    <Icon size={15}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Icon>
  );
}

export function PlusIcon() {
  return (
    <Icon size={13} strokeWidth={2.5}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}

/** Seta para baixo; o AccordionSteps gira via className quando o passo abre. */
export function ChevronIcon({ className }) {
  return (
    <Icon size={14} strokeWidth={2.5} className={className}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  );
}

export function ArrowLeftIcon() {
  return (
    <Icon size={20} strokeWidth={2.5}>
      <polyline points="15 18 9 12 15 6" />
    </Icon>
  );
}

export function ArrowRightIcon() {
  return (
    <Icon size={20} strokeWidth={2.5}>
      <polyline points="9 18 15 12 9 6" />
    </Icon>
  );
}

/* ---- Breadcrumb: um ícone por nível de navegação ---- */

/** Lista de workspaces (grade de blocos). */
export function GridIcon() {
  return (
    <Icon size={14}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

/** Um workspace (pasta de trabalho / maleta). */
export function BriefcaseIcon() {
  return (
    <Icon size={14}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="13" x2="21" y2="13" />
    </Icon>
  );
}

/** Categoria (pasta). */
export function FolderIcon() {
  return (
    <Icon size={14}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Icon>
  );
}

/** Tutorial (documento com linhas). */
export function DocumentIcon() {
  return (
    <Icon size={14}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <polyline points="14 3 14 8 19 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </Icon>
  );
}

/** Membros (duas pessoas). */
export function UsersIcon() {
  return (
    <Icon size={14}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </Icon>
  );
}

/* ---- Botão de tema ---- */

export function SunIcon() {
  return (
    <Icon size={16}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
    </Icon>
  );
}

export function MoonIcon() {
  return (
    <Icon size={16}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Icon>
  );
}
