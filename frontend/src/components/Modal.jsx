/**
 * Janela modal do site: fundo escurecido + cartão central, no mesmo visual
 * do formulário de tutorial. Fecha ao clicar fora do cartão ou apertar Esc.
 * Usada pelo TutorialForm e pelas janelas de confirmação/texto do
 * DialogProvider — em vez das janelas nativas do navegador.
 */

import { useEffect } from "react";

/**
 * headerExtra: elemento opcional ao lado do título (ex.: botão "?" que
 * reabre o tour do formulário de tutorial).
 */
export default function Modal({ title, onClose, children, wide = false, headerExtra = null }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={"modal-card" + (wide ? " wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // onMouseDown (e não onClick) no fundo: assim, selecionar texto num
        // campo e soltar o mouse fora do cartão não fecha a janela.
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || headerExtra) && (
          <div className="modal-title-row">
            {title && <h2 className="modal-title">{title}</h2>}
            {headerExtra}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
