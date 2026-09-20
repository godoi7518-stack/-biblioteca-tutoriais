import { useEffect } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "./Icons";

export default function ImageLightbox({ images, index, apiUrl, onClose, onNavigate }) {
  const image = images && index != null ? images[index] : null;

  useEffect(() => {
    if (image == null) return;

    function handleKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onNavigate(-1);
      else if (e.key === "ArrowRight") onNavigate(1);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [image, onClose, onNavigate]);

  if (!image) return null;

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>×</button>

      {hasPrev && (
        <button
          className="lightbox-nav lightbox-nav-prev"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(-1);
          }}
        >
          <ArrowLeftIcon />
        </button>
      )}

      <img
        src={`${apiUrl}${image.image_url}`}
        alt={image.caption || ""}
        onClick={(e) => e.stopPropagation()}
      />

      {hasNext && (
        <button
          className="lightbox-nav lightbox-nav-next"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(1);
          }}
        >
          <ArrowRightIcon />
        </button>
      )}

      {image.caption && (
        <div className="lightbox-caption" onClick={(e) => e.stopPropagation()}>
          {image.caption}
        </div>
      )}

      {images.length > 1 && (
        <div className="lightbox-counter">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}