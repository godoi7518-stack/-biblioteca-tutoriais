import { useState, useRef, useEffect } from "react";

/**
 * Menu de opções "⋮" reutilizável — usado em workspace, tab, tutorial (e
 * futuramente qualquer outro lugar que precise de ações em lista). Recebe
 * items: [{ label, onClick, danger? }]. Fecha sozinho ao clicar fora dele.
 */
export default function OptionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="options-menu" ref={ref}>
      <button
        className="options-menu-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        ⋮
      </button>
      {open && (
        <div className="options-menu-dropdown">
          {items.map((item, i) => (
            <button
              key={i}
              className={"options-menu-item" + (item.danger ? " danger" : "")}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}