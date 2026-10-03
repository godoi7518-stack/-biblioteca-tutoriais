import { useState, useEffect, useRef } from "react";
import MarkdownLite from "../components/MarkdownLite";
import AccordionSteps from "../components/AccordionSteps";
import { parseNumberedSteps } from "../utils/helpers";
import { getTutorial, listSteps, listImages, uploadImage, deleteImage, deleteTutorial, API_URL } from "../services/api";
import ImageLightbox from "../components/ImageLightbox";
import OptionsMenu from "../components/OptionsMenu";

export default function TutorialDetailPage({ workspace, tabId, tutorialId, initialTutorial, onDeleted }) {
  const [tutorial, setTutorial] = useState(initialTutorial || null);
  const [steps, setSteps] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

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
  }, [workspace.id, tabId, tutorialId]);

  function handleFileSelected(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    const caption = window.prompt("Legenda da imagem (opcional):") || null;

    setUploading(true);
    uploadImage(workspace.id, tabId, tutorialId, file, caption)
      .then(() => loadImages())
      .catch((err) => alert(err.message))
      .finally(() => setUploading(false));
  }

  async function handleDeleteImage(imageId) {
    if (!window.confirm("Remover esta imagem?")) return;
    try {
      await deleteImage(workspace.id, tabId, tutorialId, imageId);
      loadImages();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleEditPlaceholder() {
    alert("Reordenar e adicionar passos ainda não está disponível — chega assim que o tutorial estruturado estiver funcionando.");
  }

  async function handleDeleteTutorial() {
    if (!window.confirm("Apagar este tutorial e suas imagens? Essa ação não pode ser desfeita.")) return;
    try {
      await deleteTutorial(workspace.id, tabId, tutorialId);
      onDeleted();
    } catch (err) {
      alert(err.message);
    }
  }

  // Encontra a posição de uma imagem de passo dentro da lista completa de
  // imagens do tutorial, para abrir o lightbox no lugar certo — a navegação
  // por setas continua passando por todas as imagens, não só as do passo.
  function handleStepImageClick(img) {
    const idx = images.findIndex((i) => i.id === img.id);
    if (idx !== -1) setLightboxIndex(idx);
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

  return (
    <div className="content">
      <div className="tut-detail">
        <div className="tut-detail-header">
          <h1>{tutorial.title}</h1>
          {isAdmin && (
            <OptionsMenu
              items={[
                { label: "Editar", onClick: handleEditPlaceholder },
                { label: "Excluir tutorial", danger: true, onClick: handleDeleteTutorial },
              ]}
            />
          )}
        </div>
        <div className="meta-line">
          {isStructured ? "Tutorial estruturado" : "Tutorial em texto corrido"}
        </div>

        {isStructured ? (
          <AccordionSteps steps={structuredSteps} onImageClick={handleStepImageClick} />
        ) : parsedSimpleSteps ? (
          <AccordionSteps steps={parsedSimpleSteps} onImageClick={handleStepImageClick} />
        ) : (
          <MarkdownLite text={tutorial.content || ""} />
        )}

        <div className="page-title" style={{ marginTop: 24 }}>
          <h1 style={{ fontSize: 15 }}>
            Imagens<span className="count">{unassignedImages.length}</span>
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

        {unassignedImages.length === 0 ? (
          <div className="empty-state">Nenhuma imagem adicionada ainda.</div>
        ) : (
          <div className="image-gallery">
            {unassignedImages.map((img) => {
              const fullIndex = images.findIndex((i) => i.id === img.id);
              return (
                <div className="image-thumb" key={img.id}>
                  <button className="image-thumb-open" onClick={() => setLightboxIndex(fullIndex)}>
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

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        apiUrl={API_URL}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(delta) => setLightboxIndex((i) => Math.max(0, Math.min(images.length - 1, i + delta)))}
      />
    </div>
  );
}