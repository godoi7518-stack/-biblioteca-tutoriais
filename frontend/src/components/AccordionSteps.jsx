import { useState } from "react";
import { ChevronIcon } from "./Icons";

/**
 * Lista expansível de passos, usada tanto para tutoriais "structured"
 * (passos reais do banco) quanto "simple" com texto no padrão "1 - texto
 * 2 - texto" (parseado por parseNumberedSteps). Espera um array de objetos
 * { title, text, critical }.
 */
export default function AccordionSteps({ steps }) {
  // Um Set (não um único índice) permite vários passos abertos ao mesmo
  // tempo — abrir um não fecha os outros. Começa com o passo 0 aberto.
  const [openIndexes, setOpenIndexes] = useState(() => new Set([0]));

  function toggle(i) {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  return (
    <div className="accordion">
      {steps.map((s, i) => {
        const isOpen = openIndexes.has(i);
        return (
          <div className={"accordion-item" + (s.critical ? " critical" : "")} key={i}>
            <button className="accordion-header" onClick={() => toggle(i)}>
              <span className="step-num">{i + 1}</span>
              <span className="accordion-title">{s.title || `Passo ${i + 1}`}</span>
              <ChevronIcon className={"chevron" + (isOpen ? " open" : "")} />
            </button>
            {isOpen && (
              <div className="accordion-body">
                {s.critical && <div className="critical-flag">⚠ ETAPA CRÍTICA</div>}
                <div className="step-text">{s.text}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}