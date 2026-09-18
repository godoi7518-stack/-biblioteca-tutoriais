import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tutorial_image import TutorialImage
from app.models.membership import Membership
from app.schemas.tutorial_image import TutorialImageResponse
from app.core.dependencies import require_admin, get_workspace_membership
from app.routers.tabs import get_tab_or_404
from app.routers.tutorials import get_tutorial_or_404

router = APIRouter(
    prefix="/workspaces/{workspace_id}/tabs/{tab_id}/tutorials/{tutorial_id}/images",
    tags=["tutorial_images"],
)

UPLOAD_DIR = "static/uploads"
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("", response_model=TutorialImageResponse)
async def upload_image(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    file: UploadFile = File(...),
    caption: str | None = Form(None),
    step_id: int | None = Form(None),
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    get_tutorial_or_404(tab_id, tutorial_id, db)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de arquivo não permitido. Use JPEG, PNG ou WEBP"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo maior que 5MB"
        )

    extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{extension}"
    tutorial_dir = os.path.join(UPLOAD_DIR, "tutorials", str(tutorial_id))
    os.makedirs(tutorial_dir, exist_ok=True)

    file_path = os.path.join(tutorial_dir, filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/{file_path.replace(os.sep, '/')}"

    image = TutorialImage(
        tutorial_id=tutorial_id,
        step_id=step_id,
        image_url=image_url,
        caption=caption,
        position=0,
    )
    db.add(image)
    try:
        db.commit()
    except Exception:
        db.rollback()
        os.remove(file_path)
        raise
    db.refresh(image)
    return image


@router.get("", response_model=list[TutorialImageResponse])
def list_images(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    get_tutorial_or_404(tab_id, tutorial_id, db)

    return (
        db.query(TutorialImage)
        .filter(TutorialImage.tutorial_id == tutorial_id)
        .order_by(TutorialImage.position)
        .all()
    )


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    image_id: int = Path(..., gt=0),
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    get_tutorial_or_404(tab_id, tutorial_id, db)

    image = (
        db.query(TutorialImage)
        .filter(TutorialImage.id == image_id, TutorialImage.tutorial_id == tutorial_id)
        .first()
    )
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada"
        )

    file_path = image.image_url.lstrip("/")
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(image)
    db.commit()