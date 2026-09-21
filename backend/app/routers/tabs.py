"""Rotas de tabs (categorias/abas de conteúdo dentro de um workspace)."""

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tab import Tab
from app.models.membership import Membership
from app.schemas.tab import TabCreate, TabResponse
from app.core.dependencies import get_workspace_membership, require_admin

router = APIRouter(prefix="/workspaces/{workspace_id}/tabs", tags=["tabs"])


@router.post("", response_model=TabResponse)
def create_tab(
    workspace_id: int,
    data: TabCreate,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Cria uma nova tab dentro do workspace. Exige ser admin do workspace."""
    tab = Tab(workspace_id=workspace_id, name=data.name, description=data.description, position=data.position)
    db.add(tab)
    db.commit()
    db.refresh(tab)
    return tab


@router.get("", response_model=list[TabResponse])
def list_tabs(
    workspace_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Lista as tabs do workspace, ordenadas por position. Exige ser membro do workspace."""
    return (
        db.query(Tab)
        .filter(Tab.workspace_id == workspace_id)
        .order_by(Tab.position)
        .all()
    )


def get_tab_or_404(workspace_id: int, tab_id: int, db: Session) -> Tab:
    """Busca uma tab garantindo que ela pertence ao workspace informado.

    Função auxiliar reaproveitada pelos routers de tutorials e
    tutorial_images (não é uma rota). Filtrar por workspace_id + tab_id
    juntos impede que alguém acesse uma tab de outro workspace só
    adivinhando o ID. Levanta 404 se não encontrar.
    """
    tab = db.query(Tab).filter(Tab.id == tab_id, Tab.workspace_id == workspace_id).first()
    if tab is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aba não encontrada")
    return tab


@router.get("/{tab_id}", response_model=TabResponse)
def get_tab(
    workspace_id: int,
    tab_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Retorna uma tab específica. Exige ser membro do workspace."""
    return get_tab_or_404(workspace_id, tab_id, db)


@router.put("/{tab_id}", response_model=TabResponse)
def update_tab(
    workspace_id: int,
    tab_id: int,
    data: TabCreate,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Atualiza nome/descrição/posição de uma tab. Exige ser admin do workspace."""
    tab = get_tab_or_404(workspace_id, tab_id, db)
    tab.name = data.name
    tab.description = data.description
    tab.position = data.position
    db.commit()
    db.refresh(tab)
    return tab


@router.delete("/{tab_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tab(
    workspace_id: int,
    tab_id: int,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Apaga uma tab e, em cascata via FK, seus tutoriais. Exige ser admin do workspace."""
    tab = get_tab_or_404(workspace_id, tab_id, db)
    db.delete(tab)
    db.commit()