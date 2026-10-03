/**
 * Formulário de tutorial em modal, usado para CRIAR (Tabs.jsx) e para
 * EDITAR (TutorialDetail.jsx) — um componente só, para que qualquer ajuste
 * no formulário valha automaticamente nos dois lugares.
 *
 * O texto (título, resumo, conteúdo ou passos) é salvo numa única chamada
 * ao backend, que grava tudo ou nada. Imagens vão DEPOIS, em chamadas
 * separadas, porque precisam do id do passo — e um passo novo só tem id
 * depois de salvo.
 */

import { useState, useRef } from "react";
import { createTutorial, updateTutorial, uploadImage, deleteImage, API_URL } from "../services/api";
import { PlusIcon } from "./Icons";
import Modal from "./Modal";
import { useDialog } from "./DialogProvider";

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

export default function TutorialForm({ workspaceId, tabId, tutorial, steps, images, onSaved, onCancel }) {
  const isEdit = Boolean(tutorial);
  const dialog = useDialog();

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

  const [type, setType] = useState(tutorial?.content_type || "simple");
  const [title, setTitle] = useState(tutorial?.title || "");
  const [summary, setSummary] = useState(tutorial?.summary || "");
  const [content, setContent] = useState(tutorial?.content || "");
  const [formSteps, setFormSteps] = useState(() =>
    steps && steps.length > 0
      ? steps.map((s) => ({
          key: newKey(),
          id: s.id,
          title: s.title || "",
          content: s.content,
          is_critical: s.is_critical,
          image: null,
          // Imagens já salvas deste passo; "removed" marca as que o
          // usuário tirou — só são apagadas de verdade ao salvar, para
          // que "Cancelar" desfaça tudo.
          existingImages: (images || []).filter((img) => img.step_id === s.id).map((img) => ({ ...img, removed: false })),
        }))
      : [emptyStep()]
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateStep(index, field, value) {
    setFormSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
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
    <Modal title={isEdit ? "Editar tutorial" : "Novo tutorial"} onClose={onCancel} wide>
      {error && <div className="login-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="tut-title">Título</label>
          <input id="tut-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </div>
        <div className="field">
          <label htmlFor="tut-summary">Resumo (opcional)</label>
          <input id="tut-summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={300} />
        </div>

        <div className="field">
          <label>Tipo de tutorial</label>
          {isEdit ? (
            // Tipo é fixo depois de criado: converter arriscaria perder
            // o texto ou os passos/imagens existentes.
            <p className="login-note" style={{ marginTop: 0 }}>
              {type === "structured" ? "Passo a passo" : "Texto corrido"} — o tipo não pode ser alterado depois de criado.
            </p>
          ) : (
            <div className="type-toggle">
              <button
                type="button"
                className={"type-toggle-btn" + (type === "simple" ? " active" : "")}
                onClick={() => setType("simple")}
              >
                Texto corrido
              </button>
              <button
                type="button"
                className={"type-toggle-btn" + (type === "structured" ? " active" : "")}
                onClick={() => setType("structured")}
              >
                Passo a passo
              </button>
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
              required
              style={{ ...textareaStyle, fontSize: 14 }}
            />
          </div>
        ) : (
          <div className="field">
            <label>Passos</label>
            {formSteps.map((step, i) => (
              <div className="step-builder" key={step.key}>
                <div className="step-builder-header">
                  <span className="step-builder-num">Passo {i + 1}</span>
                  <div className="step-builder-actions">
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
                <input
                  placeholder="Título do passo"
                  value={step.title}
                  onChange={(e) => updateStep(i, "title", e.target.value)}
                  maxLength={150}
                  style={{ marginBottom: 8 }}
                />
                <textarea
                  placeholder="O que deve ser feito neste passo"
                  rows={3}
                  value={step.content}
                  onChange={(e) => updateStep(i, "content", e.target.value)}
                  style={{ ...textareaStyle, fontSize: 13 }}
                />
                <label className="step-critical-toggle">
                  <input
                    type="checkbox"
                    checked={step.is_critical}
                    onChange={(e) => updateStep(i, "is_critical", e.target.checked)}
                  />
                  Marcar como etapa crítica
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

                <label className="step-image-upload">
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
            <button
              type="button"
              className="btn-new"
              onClick={() => setFormSteps((prev) => [...prev, emptyStep()])}
              style={{ marginTop: 4 }}
            >
              <PlusIcon /> Adicionar passo
            </button>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn-new" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar tutorial"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
