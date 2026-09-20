import { useState } from "react";
import { ChevronIcon } from "./Icons";

export default function AccordionSteps({ steps }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="accordion">
      {steps.map((s, i) => {
        const isOpen = openIndex === i;
        return (
          <div className={"accordion-item" + (s.critical ? " critical" : "")} key={i}>
            <button className="accordion-header" onClick={() => setOpenIndex(isOpen ? null : i)}>
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