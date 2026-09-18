from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tutorial import Tutorial
from app.models.tutorial_step import TutorialStep
from app.models.membership import Membership
from app.schemas.tutorial import (
    TutorialCreate, TutorialResponse, TutorialStepCreate, TutorialStepResponse
)
from app.core.dependencies import get_current_user, get_workspace_membership, require_admin
from app.routers.tabs import get_tab_or_404

router = APIRouter(prefix="/workspaces/{workspace_id}/tabs/{tab_id}/tutorials", tags=["tutorials"])


@router.post("", response_model=TutorialResponse)
def create_tutorial(
    workspace_id: int,
    tab_id: int,
    data: TutorialCreate,
    admin: Membership = Depends(require_admin),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)

    tutorial = Tutorial(
        tab_id=tab_id,
        title=data.title,
        summary=data.summary,
        content_type=data.content_type,
        content=data.content,
        created_by=current_user.id,
    )
    db.add(tutorial)
    db.commit()
    db.refresh(tutorial)
    return tutorial


@router.get("", response_model=list[TutorialResponse])
def list_tutorials(
    workspace_id: int,
    tab_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    return db.query(Tutorial).filter(Tutorial.tab_id == tab_id).all()


def get_tutorial_or_404(tab_id: int, tutorial_id: int, db: Session) -> Tutorial:
    tutorial = db.query(Tutorial).filter(Tutorial.id == tutorial_id, Tutorial.tab_id == tab_id).first()
    if tutorial is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorial não encontrado")
    return tutorial


@router.get("/{tutorial_id}", response_model=TutorialResponse)
def get_tutorial(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    return get_tutorial_or_404(tab_id, tutorial_id, db)


@router.put("/{tutorial_id}", response_model=TutorialResponse)
def update_tutorial(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    data: TutorialCreate,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    tutorial = get_tutorial_or_404(tab_id, tutorial_id, db)

    tutorial.title = data.title
    tutorial.summary = data.summary
    tutorial.content_type = data.content_type
    tutorial.content = data.content
    db.commit()
    db.refresh(tutorial)
    return tutorial


@router.delete("/{tutorial_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutorial(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    tutorial = get_tutorial_or_404(tab_id, tutorial_id, db)
    db.delete(tutorial)
    db.commit()


@router.post("/{tutorial_id}/steps", response_model=TutorialStepResponse)
def add_step(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    data: TutorialStepCreate,
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    tutorial = get_tutorial_or_404(tab_id, tutorial_id, db)

    if tutorial.content_type != "structured":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível adicionar passos a tutoriais do tipo 'structured'",
        )

    step = TutorialStep(
        tutorial_id=tutorial_id,
        step_number=data.step_number,
        title=data.title,
        content=data.content,
        is_critical=data.is_critical,
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


@router.get("/{tutorial_id}/steps", response_model=list[TutorialStepResponse])
def list_steps(
    workspace_id: int,
    tab_id: int,
    tutorial_id: int,
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    get_tab_or_404(workspace_id, tab_id, db)
    get_tutorial_or_404(tab_id, tutorial_id, db)
    return (
        db.query(TutorialStep)
        .filter(TutorialStep.tutorial_id == tutorial_id)
        .order_by(TutorialStep.step_number)
        .all()
    )