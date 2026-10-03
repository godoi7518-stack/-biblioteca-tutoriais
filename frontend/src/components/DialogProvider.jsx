/**
 * Substitui window.confirm / window.prompt / window.alert por janelas do
 * próprio site (componente Modal).
 *
 * As funções nativas "travam" o código até o usuário responder. Um
 * componente React não pode fazer isso, então cada função aqui devolve uma
 * Promise que só se resolve quando o usuário clica em um botão. Na prática
 * o uso fica quase igual ao nativo, só com "await":
 *
 *   const dialog = useDialog();
 *   if (!(await dialog.confirm({ message: "Apagar?" }))) return;
 *   const nome = await dialog.prompt({ title: "Nova categoria", label: "Nome" });
 *   await dialog.alert("Algo deu errado");
 *
 * O provider fica em volta do App inteiro (main.jsx), então qualquer tela
 * pode usar useDialog().
 */

import { createContext, useContext, useMemo, useRef, useState } from "react";
import Modal from "./Modal";

const DialogContext = createContext(null);

export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  // Contador para dar uma "key" nova a cada janela: garante que o campo de
  // texto de um prompt comece limpo, sem herdar o valor do anterior.
  const counter = useRef(0);

  const api = useMemo(() => {
    function open(options) {
      return new Promise((resolve) => {
        counter.current += 1;
        setDialog({ ...options, id: counter.current, resolve });
      });
    }
    return {
      /** Resolve true (confirmou) ou false (cancelou/fechou). */
      confirm: (options) => open({ kind: "confirm", ...options }),
      /** Resolve o texto digitado (sem espaços nas pontas) ou null se cancelou. */
      prompt: (options) => open({ kind: "prompt", ...options }),
      /** Aceita só a mensagem (texto) ou as opções. Resolve ao clicar em OK. */
      alert: (options) => open({ kind: "alert", ...(typeof options === "string" ? { message: options } : options) }),
    };
  }, []);

  function close(result) {
    dialog.resolve(result);
    setDialog(null);
  }

  const cancelValue = dialog?.kind === "prompt" ? null : dialog?.kind === "confirm" ? false : undefined;

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog && (
        <Modal title={dialog.title || (dialog.kind === "alert" ? "Aviso" : "Confirmar")} onClose={() => close(cancelValue)}>
          {dialog.kind === "prompt" ? (
            <PromptBody key={dialog.id} dialog={dialog} onCancel={() => close(null)} onSubmit={(value) => close(value)} />
          ) : (
            <>
              {dialog.message && <p className="modal-message">{dialog.message}</p>}
              <div className="modal-actions">
                {dialog.kind === "confirm" && (
                  <button type="button" className="btn-new" onClick={() => close(false)}>
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  className={dialog.danger ? "btn-primary btn-danger" : "btn-primary"}
                  onClick={() => close(dialog.kind === "confirm" ? true : undefined)}
                  autoFocus
                >
                  {dialog.confirmLabel || (dialog.kind === "confirm" ? "Confirmar" : "OK")}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

/** Corpo da janela de texto: um campo + Cancelar/Salvar. */
function PromptBody({ dialog, onCancel, onSubmit }) {
  const [value, setValue] = useState(dialog.defaultValue || "");
  const trimmed = value.trim();
  const blocked = dialog.required !== false && !trimmed;

  function handleSubmit(e) {
    e.preventDefault();
    if (blocked) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit}>
      {dialog.message && <p className="modal-message">{dialog.message}</p>}
      <div className="field">
        {dialog.label && <label htmlFor="dialog-input">{dialog.label}</label>}
        <input
          id="dialog-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={dialog.placeholder}
          maxLength={dialog.maxLength}
          autoFocus
          // Seleciona o texto atual (ex.: ao renomear), para digitar por cima.
          onFocus={(e) => e.target.select()}
        />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn-new" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-primary" disabled={blocked}>
          {dialog.confirmLabel || "Salvar"}
        </button>
      </div>
    </form>
  );
}
