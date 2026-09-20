import { useState } from "react";
import { ChevronIcon } from "./Icons";

export default function AccordionSteps({ steps }) {
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