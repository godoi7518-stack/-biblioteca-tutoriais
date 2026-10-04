import { useState, useEffect, useRef } from "react";
import MarkdownLite from "../components/MarkdownLite";
import AccordionSteps from "../components/AccordionSteps";
import { parseNumberedSteps } from "../utils/helpers";
import { getTutorial, listSteps, listImages, uploadImage, deleteImage, deleteTutorial, API_URL } from "../services/api";
import ImageLightbox from "../components/ImageLightbox";
import OptionsMenu from "../components/OptionsMenu";
import TutorialForm from "../components/TutorialForm";
import { useDialog } from "../components/DialogProvider";

export default function TutorialDetailPage({ user, workspace, tabId, tutorialId, initialTutorial, onDeleted, onUpdated }) {
  const [tutorial, setTutorial] = useState(initialTutorial || null);
  const [steps, setSteps] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  // Visualizador em tela cheia: { images, index, label } do grupo aberto
  // (imagens de um passo OU imagens gerais), ou null quando fechado.
  const [lightbox, setLightbox] = useState(null);
  const [editing, setEditing] = useState(false);
  const dialog = useDialog();
  // Incrementado depois de salvar uma edição: entra nas dependências do
  // useEffect abaixo e força recarregar tutorial, passos e imagens.
  const [reloadKey, setReloadKey] = useState(0);

  function loadImages() {
    listImages(workspace.id, tabId, tutorialId)
      .then(setImages)
      .catch(() => {});
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getTutorial(workspace.id, tabId, tutorialId)
      .then((data) => {
        if (cancelled) return;
        setTutorial(data);
        if (data.content_type === "structured") {
          return listSteps(workspace.id, tabId, tutorialId).then((s) => {
            if (!cancelled) setSteps(s);
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [workspace.id, tabId, tutorialId, reloadKey]);

  async function handleFileSelected(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    // Salvar com o campo vazio envia sem legenda; Cancelar desiste do envio.
    const caption = await dialog.prompt({
      title: "Legenda da imagem",
      message: file.name,
      label: "Legenda (opcional)",
      maxLength: 200,
      required: false,
      confirmLabel: "Enviar imagem",
    });
    if (caption === null) return;

    setUploading(true);
    uploadImage(workspace.id, tabId, tutorialId, file, caption || null)
      .then(() => loadImages())
      .catch((err) => dialog.alert(err.message))
      .finally(() => setUploading(false));
  }

  async function handleDeleteImage(imageId) {
    const ok = await dialog.confirm({
      title: "Remover imagem",
      message: "A imagem será apagada deste tutorial.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteImage(workspace.id, tabId, tutorialId, imageId);
      loadImages();
    } catch (err) {
      dialog.alert(err.message);
    }
  }

  function handleSaved(saved) {
    setEditing(false);
    setReloadKey((k) => k + 1);
    // Avisa o App para atualizar o título no breadcrumb.
    if (onUpdated) onUpdated(saved);
  }

  async function handleDeleteTutorial() {
    const ok = await dialog.confirm({
      title: "Apagar tutorial",
      message: "O tutorial e suas imagens serão apagados. Essa ação não pode ser desfeita.",
      confirmLabel: "Apagar tutorial",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTutorial(workspace.id, tabId, tutorialId);
      onDeleted();
    } catch (err) {
      dialog.alert(err.message);
    }
  }

  /** Abre o visualizador navegando só dentro de um grupo de imagens. */
  function openLightbox(group, img, label) {
    const index = group.findIndex((i) => i.id === img.id);
    if (index !== -1) setLightbox({ images: group, index, label });
  }

  // Imagem clicada dentro de um passo: as setas percorrem só as imagens
  // daquele passo (antes percorriam todas as do tutorial, misturadas).
  function handleStepImageClick(img) {
    const group = images.filter((i) => i.step_id === img.step_id);
    const stepNumber = (steps || []).findIndex((s) => s.id === img.step_id) + 1;
    openLightbox(group, img, stepNumber > 0 ? `Passo ${stepNumber}` : "Imagens do passo");
  }

  if (loading && !tutorial) {
    return (
      <div className="content">
        <p>Carregando tutorial…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content">
        <p className="login-error">{error}</p>
      </div>
    );
  }

  const isStructured = tutorial.content_type === "structured";

  // Só admin edita, apaga e mexe nas imagens. Esconder é conforto visual;
  // o backend (require_admin) barra quem tentar mesmo assim.
  const isAdmin = workspace.my_role === "admin";

  const structuredSteps = isStructured
    ? (steps || []).map((s) => ({
        title: s.title,
        text: s.content,
        critical: s.is_critical,
        images: images
          .filter((img) => img.step_id === s.id)
          .map((img) => ({ ...img, src: `${API_URL}${img.image_url}` })),
      }))
    : null;

  const parsedSimpleSteps = !isStructured ? parseNumberedSteps(tutorial.content) : null;

  // A galeria geral mostra só imagens sem passo associado — as que têm
  // step_id aparecem dentro do respectivo passo no acordeão, não aqui.
  const unassignedImages = images.filter((img) => !img.step_id);
  // Em tutorial passo a passo, "gerais" deixa claro que não são de um passo.
  const galleryLabel = isStructured ? "Imagens gerais" : "Imagens";

  return (
    // data-tour-ready / data-tour: marcadores do onboarding (src/onboarding).
    <div className="content" data-tour-ready={!loading || undefined}>
      <div className="tut-detail">
        <div className="tut-detail-header">
          <h1>{tutorial.title}</h1>
          {isAdmin && (
            <span data-tour="tut-menu">
              <OptionsMenu
                items={[
                  { label: "Editar", onClick: () => setEditing(true) },
                  { label: "Excluir tutorial", danger: true, onClick: handleDeleteTutorial },
                ]}
              />
            </span>
          )}
        </div>
        <div className="meta-line">
          {isStructured ? "Tutorial estruturado" : "Tutorial em texto corrido"}
        </div>

        {isStructured ? (
          <div data-tour="tut-steps">
            <AccordionSteps steps={structuredSteps} onImageClick={handleStepImageClick} />
          </div>
        ) : parsedSimpleSteps ? (
          <div data-tour="tut-steps">
            <AccordionSteps steps={parsedSimpleSteps} onImageClick={handleStepImageClick} />
          </div>
        ) : (
          <MarkdownLite text={tutorial.content || ""} />
        )}

        <div className="page-title" style={{ marginTop: 24 }} data-tour="tut-images">
          <h1 style={{ fontSize: 15 }}>
            {galleryLabel}
            <span className="count">{unassignedImages.length}</span>
          </h1>
          {isAdmin && (
            <>
              <button className="btn-new" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                {uploading ? "Enviando…" : "+ Adicionar imagem"}
              </button>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileSelected}
              />
            </>
          )}
        </div>

        {isStructured && (
          <p className="gallery-note">
            Imagens que valem para o tutorial todo. As imagens de cada passo ficam dentro do próprio passo.
          </p>
        )}
        {unassignedImages.length === 0 ? (
          <div className="empty-state">
            {isStructured ? "Nenhuma imagem geral adicionada." : "Nenhuma imagem adicionada ainda."}
          </div>
        ) : (
          <div className="image-gallery">
            {unassignedImages.map((img) => {
              return (
                <div className="image-thumb" key={img.id}>
                  <button className="image-thumb-open" onClick={() => openLightbox(unassignedImages, img, galleryLabel)}>
                    <img src={`${API_URL}${img.image_url}`} alt={img.caption || tutorial.title} />
                  </button>
                  {isAdmin && (
                    <button className="image-thumb-remove" onClick={() => handleDeleteImage(img.id)}>
                      ×
                    </button>
                  )}
                  {img.caption && <div className="image-thumb-caption">{img.caption}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <TutorialForm
          userId={user.id}
          workspaceId={workspace.id}
          tabId={tabId}
          tutorial={tutorial}
          steps={steps}
          images={images}
          onCancel={() => setEditing(false)}
          onSaved={handleSaved}
        />
      )}

      <ImageLightbox
        images={lightbox?.images}
        index={lightbox?.index ?? null}
        label={lightbox?.label}
        apiUrl={API_URL}
        onClose={() => setLightbox(null)}
        onNavigate={(delta) =>
          setLightbox((lb) => lb && { ...lb, index: Math.max(0, Math.min(lb.images.length - 1, lb.index + delta)) })
        }
      />
    </div>
  );
}