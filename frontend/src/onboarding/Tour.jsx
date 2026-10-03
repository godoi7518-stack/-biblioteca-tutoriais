/**
 * Tour guiado: escurece a tela, destaca um elemento real (marcado com
 * data-tour="...") e mostra um balão com explicação e navegação.
 *
 * Como funciona:
 * 1. Espera a tela terminar de carregar (elemento com data-tour-ready),
 *    para não começar antes da lista aparecer.
 * 2. Mantém só os passos cujo elemento existe agora (ex.: lista vazia →
 *    usa o passo alternativo "ws-empty" no lugar de "ws-list").
 * 3. A cada passo, rola até o elemento, mede a posição dele na tela e
 *    posiciona o "recorte" iluminado e o balão (abaixo ou acima dele).
 *
 * onClose é chamado ao concluir, pular, apertar Esc — ou na hora, se não
 * sobrar nenhum passo para mostrar.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const READY_TIMEOUT_MS = 5000; // depois disso, segue com o que estiver na tela
const GAP = 12; // distância entre o elemento destacado e o balão
const MARGIN = 16; // distância mínima do balão até a borda da janela
const PADDING = 6; // folga do recorte iluminado em volta do elemento

function findTarget(target) {
  return target ? document.querySelector(`[data-tour="${target}"]`) : null;
}

export default function Tour({ steps, onClose }) {
  const [available, setAvailable] = useState(null); // null = ainda esperando a tela
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [cardPos, setCardPos] = useState(null);
  const cardRef = useRef(null);

  // 1 e 2: espera a tela ficar pronta e filtra os passos possíveis.
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const ready = document.querySelector("[data-tour-ready]");
      if (ready || Date.now() - start > READY_TIMEOUT_MS) {
        clearInterval(timer);
        setAvailable(steps.filter((s) => !s.target || findTarget(s.target)));
      }
    }, 100);
    return () => clearInterval(timer);
  }, [steps]);

  // Nenhum passo possível: encerra sem mostrar nada.
  useEffect(() => {
    if (available && available.length === 0) onClose();
  }, [available]);

  const step = available?.[index];

  // 3: mede o elemento do passo atual (e de novo ao rolar ou redimensionar).
  useLayoutEffect(() => {
    if (!step) return;
    const el = findTarget(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "center", inline: "nearest" });
    function measure() {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step]);

  // Posiciona o balão: abaixo do elemento; se não couber, acima; sempre
  // dentro da janela. Sem elemento (boas-vindas), fica centralizado.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !rect) {
      setCardPos(null);
      return;
    }
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top = rect.top + rect.height + PADDING + GAP;
    if (top + ch > vh - MARGIN) top = rect.top - PADDING - GAP - ch;
    top = Math.max(MARGIN, Math.min(top, vh - ch - MARGIN));
    const left = Math.max(MARGIN, Math.min(rect.left, vw - cw - MARGIN));
    setCardPos({ top, left });
  }, [rect, index]);

  const isLast = available ? index === available.length - 1 : false;

  function next() {
    if (isLast) onClose();
    else setIndex((i) => i + 1);
  }
  function back() {
    setIndex((i) => Math.max(0, i - 1));
  }

  // Teclado: Esc pula o tour, setas navegam. Escuta na fase de "captura"
  // e interrompe o evento: assim, com o tour aberto por cima de uma janela
  // (ex.: formulário de tutorial), o Esc fecha só o tour, não a janela.
  useEffect(() => {
    if (!step) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
      else return;
      e.stopPropagation();
    }
    document.addEventListener("keydown", handleKey, true);
    return () => document.removeEventListener("keydown", handleKey, true);
  });

  if (!step) return null;

  return (
    <div className="tour-root">
      {/* Camada transparente que impede cliques na página durante o tour. */}
      <div className="tour-blocker" />
      {rect ? (
        <div
          className="tour-spotlight"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
          }}
        />
      ) : (
        <div className="tour-backdrop" />
      )}

      <div
        ref={cardRef}
        className={"tour-card" + (rect ? "" : " centered")}
        // Com elemento destacado, o balão só aparece depois de posicionado
        // (senão "pularia" do canto da tela para o lugar certo).
        style={rect ? (cardPos ? { top: cardPos.top, left: cardPos.left } : { visibility: "hidden" }) : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
      >
        <div className="tour-progress">
          {index + 1} de {available.length}
        </div>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-text">{step.text}</p>
        <div className="tour-actions">
          <button type="button" className="link-button" onClick={onClose}>
            Pular tour
          </button>
          <div className="tour-nav">
            {index > 0 && (
              <button type="button" className="btn-new" onClick={back}>
                Voltar
              </button>
            )}
            <button type="button" className="btn-primary" onClick={next} autoFocus>
              {isLast ? "Concluir" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
