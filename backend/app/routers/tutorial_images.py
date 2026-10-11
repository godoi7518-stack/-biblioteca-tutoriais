"""Rotas de upload, listagem e remoção de imagens de tutorial.

Os arquivos são guardados pelo módulo app.core.storage (disco local ou
Cloudflare R2, conforme STORAGE_BACKEND) e registrados no banco com a URL
devolvida por ele. O campo step_id é opcional: uma imagem pode estar
associada a um passo específico de um tutorial "structured" ou só ao
tutorial em geral.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tutorial_image import TutorialImage
from app.models.membership import Membership
from app.schemas.tutorial_image import TutorialImageResponse
from app.core.dependencies import require_admin, get_workspace_membership
from app.core.storage import save_image, delete_images
from app.routers.tabs import get_tab_or_404
from app.routers.tutorials import get_tutorial_or_404

router = APIRouter(
    prefix="/workspaces/{workspace_id}/tabs/{tab_id}/tutorials/{tutorial_id}/images",
    tags=["tutorial_images"],
)

# Tipo aceito → extensão do arquivo salvo. A extensão vem do TIPO, não do
# nome enviado: antes, um "pagina.html" enviado como image/png era salvo
# como .html e o servidor o entregava como página (risco de script
# malicioso rodando no endereço da API).
ALLOWED_CONTENT_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
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
    """Recebe um arquivo de imagem (multipart/form-data) e associa ao tutorial.

    Exige ser admin do workspace. Valida content_type (apenas JPEG/PNG/WEBP)
    e tamanho (máx. 5MB) antes de gravar. O nome do arquivo salvo é um uuid4
    aleatório, não o nome original — evita colisão entre uploads e evita
    path traversal via nome de arquivo malicioso.

    Se o INSERT no banco falhar depois do arquivo já gravado (ex.: step_id
    de um passo inexistente), o arquivo é apagado antes de relançar o erro,
    para não deixar imagem órfã sem registro associado.
    """
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

    extension = ALLOWED_CONTENT_TYPES[file.content_type]
    image_url = save_image(contents, tutorial_id, extension, file.content_type)

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
        delete_images([image_url])
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
    """Lista as imagens de um tutorial, ordenadas por position. Exige ser membro do workspace."""
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
    """Remove uma imagem do banco e o arquivo correspondente. Exige ser admin do workspace.

    Apaga a linha primeiro e o arquivo só depois do commit (mesma regra do
    resto do projeto): se o commit falhasse, a linha continuaria apontando
    para um arquivo que já não existe.
    """
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

    image_url = image.image_url
    db.delete(image)
    db.commit()
    delete_images([image_url])