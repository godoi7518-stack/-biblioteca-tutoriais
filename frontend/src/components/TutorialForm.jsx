/**
 * Formulário de tutorial em modal, usado para CRIAR (Tabs.jsx) e para
 * EDITAR (TutorialDetail.jsx) — um componente só, para que qualquer ajuste
 * no formulário valha automaticamente nos dois lugares.
 *
 * O texto (título, resumo, conteúdo ou passos) é salvo numa única chamada
 * ao backend, que grava tudo ou nada. Imagens vão DEPOIS, em chamadas
 * separadas, porque precisam do id do passo — e um passo novo só tem id
 * depois de salvo.
 *
 * Rascunho: tudo o que é digitado fica salvo no navegador (utils/drafts.js)
 * enquanto o formulário está aberto. Fechar sem querer (Esc, clique fora)
 * não perde nada: ao reabrir, o rascunho é restaurado. Salvar o tutorial
 * apaga o rascunho.
 */

import { useState, useRef, useEffect } from "react";
import { createTutorial, updateTutorial, uploadImage, deleteImage, API_URL } from "../services/api";
import { PlusIcon } from "./Icons";
import Modal from "./Modal";
import { useDialog } from "./DialogProvider";
import { draftKey, loadDraft, saveDraft, clearDraft } from "../utils/drafts";
import Tour from "../onboarding/Tour";
import { TOURS } from "../onboarding/tours";
import { useOnboarding } from "../onboarding/OnboardingContext";

// Opções de formato, com a explicação do que cada uma gera para quem lê.
// "Passo a passo" vem primeiro e é o padrão: é o diferencial do produto.
const TYPE_OPTIONS = [
  {
    value: "structured",
    label: "Passo a passo",
    desc: "Cada etapa vira um bloco que o leitor abre e segue na ordem, com etapas críticas em destaque e imagem por passo. Ideal para procedimentos.",
  },
  {
    value: "simple",
    label: "Texto corrido",
    desc: "Um texto único, como um aviso, uma regra ou uma explicação curta.",
  },
];

const textareaStyle = {
  width: "100%",
  padding: "9px 10px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "inherit",
  resize: "vertical",
};

export default function TutorialForm({ userId, workspaceId, tabId, tutorial, steps, images, onSaved, onCancel }) {
  const isEdit = Boolean(tutorial);
  const dialog = useDialog();
  const onboarding = useOnboarding();
  const key = draftKey({ userId, workspaceId, tabId, tutorialId: tutorial?.id });

  // Cada passo do formulário ganha uma "key" própria e estável. Usar o
  // índice como key do React quebraria ao reordenar (o campo de arquivo
  // escolhido "pularia" para o passo errado).
  const nextKey = useRef(0);
  function newKey() {
    nextKey.current += 1;
    return nextKey.current;
  }

  function emptyStep() {
    return { key: newKey(), id: null, title: "", content: "", is_critical: false, image: null, existingImages: [] };
  }

  /** Imagens já salvas de um passo; "removed" marca as que o usuário tirou
      (só são apagadas de verdade ao salvar, então fechar desfaz). */
  function savedImagesOf(stepId, removedIds = []) {
    return (images || [])
      .filter((img) => img.step_id === stepId)
      .map((img) => ({ ...img, removed: removedIds.includes(img.id) }));
  }

  /** Valores do tutorial como está salvo (ou vazio, se for novo). */
  function originalValues() {
    return {
      type: tutorial?.content_type || "structured",
      title: tutorial?.title || "",
      summary: tutorial?.summary || "",
      content: tutorial?.content || "",
      steps:
        steps && steps.length > 0
          ? steps.map((st) => ({
              key: newKey(),
              id: st.id,
              title: st.title || "",
              content: st.content,
              is_critical: st.is_critical,
              image: null,
              existingImages: savedImagesOf(st.id),
            }))
          : [emptyStep()],
    };
  }

  /** Valores de um rascunho salvo. Um passo do rascunho que não existe mais
      no tutorial (apagado depois) volta como passo novo, sem perder o texto. */
  function valuesFromDraft(d) {
    const currentIds = new Set((steps || []).map((st) => st.id));
    return {
      type: isEdit ? tutorial.content_type : d.type,
      title: d.title,
      summary: d.summary,
      content: d.content,
      steps:
        d.steps && d.steps.length > 0
          ? d.steps.map((ds) => {
              const stillExists = ds.id != null && currentIds.has(ds.id);
              return {
                key: newKey(),
                id: stillExists ? ds.id : null,
                title: ds.title,
                content: ds.content,
                is_critical: ds.is_critical,
                image: null,
                existingImages: stillExists ? savedImagesOf(ds.id, ds.removedImageIds || []) : [],
              };
            })
          : [emptyStep()],
    };
  }

  /** Versão em texto do formulário (sem as keys internas nem arquivos),
      usada para salvar o rascunho e para saber se algo foi alterado. */
  function snapshot(v) {
    return JSON.stringify({
      type: v.type,
      title: v.title,
      summary: v.summary,
      content: v.content,
      steps: v.steps.map((st) => ({
        id: st.id,
        title: st.title,
        content: st.content,
        is_critical: st.is_critical,
        removedImageIds: st.existingImages.filter((img) => img.removed).map((img) => img.id),
      })),
    });
  }

  // Calculado uma vez, ao abrir: se existe rascunho, começa por ele.
  const [initial] = useState(() => {
    const original = originalValues();
    const draft = loadDraft(key);
    return {
      originalSnapshot: snapshot(original),
      draft,
      values: draft ? valuesFromDraft(draft) : original,
    };
  });

  const [type, setType] = useState(initial.values.type);
  const [title, setTitle] = useState(initial.values.title);
  const [summary, setSummary] = useState(initial.values.summary);
  const [content, setContent] = useState(initial.values.content);
  const [formSteps, setFormSteps] = useState(initial.values.steps);
  const [restoredDraft, setRestoredDraft] = useState(initial.draft);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Depois de salvar com sucesso, o rascunho não deve ser gravado de novo.
  const finished = useRef(false);

  // Mini-tour do formulário, só na primeira vez (fica salvo no backend).
  const [showFormTour, setShowFormTour] = useState(() => Boolean(onboarding) && !onboarding.hasSeen("tutorial-form"));
  // Incrementado pelo botão "?" para reiniciar o tour do primeiro passo.
  const [formTourRun, setFormTourRun] = useState(0);

  function openFormTour() {
    setFormTourRun((n) => n + 1);
    setShowFormTour(true);
  }

  // Passo recém-adicionado: recebe o foco para a pessoa já sair digitando.
  const [focusKey, setFocusKey] = useState(null);
  useEffect(() => {
    if (focusKey !== null) document.getElementById(`step-title-${focusKey}`)?.focus();
  }, [focusKey]);

  // Arrastar para reordenar. O bloco só fica "arrastável" enquanto o mouse
  // está pressionado na alça ⠿ — senão selecionar texto num campo
  // arrastaria o passo inteiro.
  const [armedKey, setArmedKey] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const currentSnapshot = snapshot({ type, title, summary, content, steps: formSteps });
  const isDirty = currentSnapshot !== initial.originalSnapshot;

  function persistDraft() {
    if (finished.current) return;
    if (isDirty) {
      saveDraft(key, { ...JSON.parse(currentSnapshot), baseUpdatedAt: tutorial?.updated_at || null });
    } else {
      clearDraft(key);
    }
  }

  // Salva o rascunho meio segundo depois da última alteração (não a cada
  // tecla, para não escrever no navegador o tempo todo).
  useEffect(() => {
    const timer = setTimeout(persistDraft, 500);
    return () => clearTimeout(timer);
  }, [currentSnapshot]);

  /** Fechar (Esc, clique fora, botão): grava o rascunho na hora, para não
      perder o que foi digitado nesse último meio segundo. */
  function handleClose() {
    persistDraft();
    onCancel();
  }

  async function handleDiscardDraft() {
    const ok = await dialog.confirm({
      title: "Descartar rascunho",
      message: isEdit
        ? "As alterações não salvas serão perdidas e o formulário volta para a versão salva do tutorial."
        : "Tudo o que foi digitado neste rascunho será perdido.",
      confirmLabel: "Descartar",
      danger: true,
    });
    if (!ok) return;
    const original = originalValues();
    setType(original.type);
    setTitle(original.title);
    setSummary(original.summary);
    setContent(original.content);
    setFormSteps(original.steps);
    setRestoredDraft(null);
    clearDraft(key);
  }

  // Rascunho de edição feito antes de alguém salvar outra versão do tutorial.
  const draftIsStale =
    restoredDraft && isEdit && restoredDraft.baseUpdatedAt && restoredDraft.baseUpdatedAt !== tutorial.updated_at;

  function updateStep(index, field, value) {
    setFormSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  function addStep() {
    const step = emptyStep();
    setFormSteps((prev) => [...prev, step]);
    setFocusKey(step.key);
  }

  /** Move o passo da posição "from" para a posição "to" (arrastar). */
  function moveStepTo(from, to) {
    setFormSteps((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
    setArmedKey(null);
  }

  function moveStep(index, delta) {
    setFormSteps((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function toggleExistingImage(stepIndex, imageId) {
    setFormSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex
          ? { ...s, existingImages: s.existingImages.map((img) => (img.id === imageId ? { ...img, removed: !img.removed } : img)) }
          : s
      )
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (type === "structured") {
      const incomplete = formSteps.some((s) => !s.title.trim() || !s.content.trim());
      if (incomplete || formSteps.length === 0) {
        setError("Preencha título e conteúdo de todos os passos (ou remova os vazios).");
        return;
      }
    }

    const stepsPayload =
      type === "structured"
        ? formSteps.map((s) => ({ id: s.id, title: s.title, content: s.content, is_critical: s.is_critical }))
        : null;

    setSubmitting(true);
    let saved;
    try {
      const base = { title, summary: summary || null };
      saved = isEdit
        ? await updateTutorial(workspaceId, tabId, tutorial.id, {
            ...base,
            ...(type === "simple" ? { content } : { steps: stepsPayload }),
          })
        : await createTutorial(workspaceId, tabId, {
            ...base,
            content_type: type,
            content: type === "simple" ? content : null,
            steps: stepsPayload,
          });
    } catch (err) {
      // Nada foi salvo (o backend grava tudo ou nada): o formulário
      // continua aberto com o que foi digitado.
      setError(err.message);
      setSubmitting(false);
      return;
    }

    // O texto está salvo no servidor: o rascunho não é mais necessário.
    finished.current = true;
    clearDraft(key);

    // Texto salvo. Agora as imagens: a resposta traz os passos na mesma
    // ordem do formulário, então saved.steps[i] é o passo formSteps[i].
    const failures = [];
    if (type === "structured") {
      for (let i = 0; i < formSteps.length; i++) {
        const s = formSteps[i];
        for (const img of s.existingImages.filter((im) => im.removed)) {
          try {
            await deleteImage(workspaceId, tabId, saved.id, img.id);
          } catch (err) {
            failures.push(`remover imagem do passo ${i + 1}: ${err.message}`);
          }
        }
        if (s.image) {
          try {
            await uploadImage(workspaceId, tabId, saved.id, s.image, null, saved.steps[i].id);
          } catch (err) {
            failures.push(`imagem do passo ${i + 1}: ${err.message}`);
          }
        }
      }
    }
    setSubmitting(false);

    if (failures.length > 0) {
      await dialog.alert({
        title: "Tutorial salvo com avisos",
        message: "O tutorial foi salvo, mas algumas imagens falharam:\n\n" + failures.join("\n"),
      });
    }
    onSaved(saved);
  }

  return (
    <Modal
      title={isEdit ? "Editar tutorial" : "Novo tutorial"}
      onClose={handleClose}
      wide
      // O "?" do header do site fica escondido atrás do formulário; este
      // reabre o mini-tour do próprio formulário.
      headerExtra={
        onboarding && (
          <button
            type="button"
            className="help-button inline"
            onClick={openFormTour}
            title="Ver dicas do formulário"
            aria-label="Ver dicas do formulário"
          >
            ?
          </button>
        )
      }
    >
      {restoredDraft && (
        <div className="draft-banner">
          <div>
            <strong>Rascunho restaurado</strong> (salvo em{" "}
            {new Date(restoredDraft.savedAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
            ). Imagens escolhidas antes precisam ser selecionadas de novo.
            {draftIsStale && (
              <div className="draft-banner-warning">
                O tutorial foi alterado depois deste rascunho. Ao salvar, a versão do rascunho substitui a atual.
              </div>
            )}
          </div>
          <button type="button" className="link-button" onClick={handleDiscardDraft}>
            Descartar rascunho
          </button>
        </div>
      )}

      {error && <div className="login-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="tut-title">Título do tutorial</label>
          <input
            id="tut-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Ex.: Como reimprimir uma etiqueta"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="tut-summary">Resumo (opcional)</label>
          <input
            id="tut-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={300}
            placeholder="Ex.: Quando a etiqueta sai borrada ou não é impressa"
          />
        </div>

        <div className="field">
          <label>Formato</label>
          {isEdit ? (
            // Tipo é fixo depois de criado: converter arriscaria perder
            // o texto ou os passos/imagens existentes.
            <p className="login-note" style={{ marginTop: 0 }} data-tour="form-type">
              {type === "structured" ? "Passo a passo" : "Texto corrido"} — o formato não pode ser alterado depois de criado.
            </p>
          ) : (
            <div className="type-options" data-tour="form-type">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={"type-option" + (type === opt.value ? " active" : "")}
                  onClick={() => setType(opt.value)}
                  aria-pressed={type === opt.value}
                >
                  <span className="type-option-title">{opt.label}</span>
                  <span className="type-option-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {type === "simple" ? (
          <div className="field">
            <label htmlFor="tut-content">Conteúdo</label>
            <textarea
              id="tut-content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva o texto do tutorial. Use **asteriscos** para negrito."
              required
              style={{ ...textareaStyle, fontSize: 14 }}
            />
          </div>
        ) : (
          <div className="field">
            <label>Passos</label>
            {formSteps.map((step, i) => (
              <div
                key={step.key}
                className={
                  "step-builder" +
                  (step.is_critical ? " critical" : "") +
                  (dragIndex === i ? " dragging" : "") +
                  (overIndex === i && dragIndex !== null && dragIndex !== i
                    ? dragIndex > i
                      ? " drop-before"
                      : " drop-after"
                    : "")
                }
                data-tour={i === 0 ? "form-step" : undefined}
                draggable={armedKey === step.key}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(i)); // exigido pelo Firefox
                  setDragIndex(i);
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault(); // permite soltar aqui
                  if (overIndex !== i) setOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) moveStepTo(dragIndex, i);
                  endDrag();
                }}
                onDragEnd={endDrag}
              >
                <div className="step-builder-header">
                  <span className="step-builder-num">
                    <span
                      className="step-drag-handle"
                      data-tour={i === 0 ? "form-drag" : undefined}
                      title="Arraste para mudar a ordem"
                      aria-hidden="true"
                      onMouseDown={() => setArmedKey(step.key)}
                      onMouseUp={() => setArmedKey(null)}
                    >
                      ⠿
                    </span>
                    Passo {i + 1}
                  </span>
                  <div className="step-builder-actions">
                    {/* As setas continuam existindo: arrastar não funciona no
                        celular (toque) nem por teclado. */}
                    <span className="step-move-buttons" data-tour={i === 0 ? "form-move" : undefined}>
                      <button
                        type="button"
                        className="step-builder-move"
                        onClick={() => moveStep(i, -1)}
                        disabled={i === 0}
                        aria-label={`Mover passo ${i + 1} para cima`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="step-builder-move"
                        onClick={() => moveStep(i, 1)}
                        disabled={i === formSteps.length - 1}
                        aria-label={`Mover passo ${i + 1} para baixo`}
                      >
                        ↓
                      </button>
                    </span>
                    {formSteps.length > 1 && (
                      <button
                        type="button"
                        className="step-builder-remove"
                        onClick={() => setFormSteps((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                <label className="step-field-label" htmlFor={`step-title-${step.key}`}>
                  Título do passo
                </label>
                <input
                  id={`step-title-${step.key}`}
                  placeholder={i === 0 ? "Ex.: Abra o sistema de etiquetas" : "O que fazer neste passo"}
                  value={step.title}
                  onChange={(e) => updateStep(i, "title", e.target.value)}
                  maxLength={150}
                  style={{ marginBottom: 8 }}
                />
                <label className="step-field-label" htmlFor={`step-content-${step.key}`}>
                  Como fazer
                </label>
                <textarea
                  id={`step-content-${step.key}`}
                  placeholder={
                    i === 0 ? "Ex.: Clique em Reimprimir, escolha a impressora da linha e confirme." : "Explique como fazer"
                  }
                  rows={3}
                  value={step.content}
                  onChange={(e) => updateStep(i, "content", e.target.value)}
                  style={{ ...textareaStyle, fontSize: 13 }}
                />
                <label
                  className={"critical-toggle" + (step.is_critical ? " on" : "")}
                  data-tour={i === 0 ? "form-critical" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={step.is_critical}
                    onChange={(e) => updateStep(i, "is_critical", e.target.checked)}
                  />
                  <span className="critical-toggle-icon" aria-hidden="true">
                    ⚠
                  </span>
                  <span>
                    <strong>Etapa crítica</strong>
                    <span className="critical-toggle-hint"> aparece em vermelho para quem lê</span>
                  </span>
                </label>

                {step.existingImages.length > 0 && (
                  <div className="step-image-row">
                    {step.existingImages.map((img) => (
                      <div
                        key={img.id}
                        className={"step-image-thumb editable" + (img.removed ? " removed" : "")}
                      >
                        <img src={`${API_URL}${img.image_url}`} alt={img.caption || `Imagem do passo ${i + 1}`} />
                        <button
                          type="button"
                          className="image-thumb-remove"
                          onClick={() => toggleExistingImage(i, img.id)}
                          title={img.removed ? "Manter imagem" : "Remover imagem"}
                        >
                          {img.removed ? "↺" : "×"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="step-image-upload" data-tour={i === 0 ? "form-image" : undefined}>
                  <span>{step.existingImages.length > 0 ? "Adicionar outra imagem (opcional)" : "Imagem do passo (opcional)"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => updateStep(i, "image", e.target.files[0] || null)}
                  />
                  {step.image && <span className="step-image-filename">{step.image.name}</span>}
                </label>
              </div>
            ))}
            <button type="button" className="btn-new" onClick={addStep} style={{ marginTop: 4 }} data-tour="form-add-step">
              <PlusIcon /> Adicionar passo
            </button>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn-new" onClick={handleClose}>
            Fechar
          </button>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar tutorial"}
          </button>
        </div>
        {isDirty && (
          <p className="login-note" style={{ textAlign: "center" }}>
            O que você digitou fica salvo como rascunho neste navegador até você salvar ou descartar.
          </p>
        )}
      </form>

      {showFormTour && (
        <Tour
          key={formTourRun}
          steps={TOURS["tutorial-form"]}
          onClose={() => {
            setShowFormTour(false);
            onboarding.markSeen("tutorial-form");
          }}
        />
      )}
    </Modal>
  );
}
