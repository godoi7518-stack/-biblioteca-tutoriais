"""Rotas de workspaces: criação, listagem e gerenciamento de membros.

Um workspace é o "grupo de trabalho" que contém as categorias (tabs) e
tutoriais. Qualquer usuário logado pode criar um workspace, e quem cria
vira automaticamente admin dele.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse
from app.schemas.membership import MembershipInvite, MemberResponse
from app.models.membership import Membership, MembershipRole
from app.core.dependencies import get_current_user, get_workspace_membership, require_admin

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _to_member_response(membership: Membership, user: User) -> MemberResponse:
    """Junta uma Membership e o User correspondente no formato MemberResponse."""
    return MemberResponse(
        id=membership.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=membership.role,
        created_at=membership.created_at,
    )


@router.post("", response_model=WorkspaceResponse)
def create_workspace(
    data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cria um workspace novo. Exige apenas estar logado (sem restrição de papel).

    Quem cria o workspace vira admin dele automaticamente, via uma
    Membership criada em seguida.
    """
    workspace = Workspace(name=data.name, owner_id=current_user.id)
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    membership = Membership(user_id=current_user.id, workspace_id=workspace.id, role=MembershipRole.ADMIN)
    db.add(membership)
    db.commit()

    return workspace


@router.get("", response_model=list[WorkspaceResponse])
def list_my_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista os workspaces em que o usuário logado é membro (admin ou member)."""
    return (
        db.query(Workspace)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .filter(Membership.user_id == current_user.id)
        .all()
    )


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: int = Path(..., gt=0),
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Retorna um workspace específico. Exige ser membro dele (admin ou member)."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace não encontrado")
    return workspace


@router.post("/{workspace_id}/members", response_model=MemberResponse)
def invite_member(
    data: MembershipInvite,
    workspace_id: int = Path(..., gt=0),
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Adiciona um usuário já cadastrado ao workspace. Exige ser admin do workspace.

    Não envia convite por e-mail nem cria conta para quem ainda não tem
    cadastro — busca um usuário existente pelo e-mail informado. Levanta 404
    se o e-mail não corresponder a nenhum usuário, e 400 se a pessoa já for
    membro deste workspace. Devolve o novo membro no mesmo formato de
    list_members (com nome e e-mail do usuário).
    """
    user = db.query(User).filter(User.email == data.email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    existing = (
        db.query(Membership)
        .filter(Membership.workspace_id == workspace_id, Membership.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuário já é membro deste workspace")

    membership = Membership(user_id=user.id, workspace_id=workspace_id, role=data.role)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return _to_member_response(membership, user)


@router.get("/{workspace_id}/members", response_model=list[MemberResponse])
def list_members(
    workspace_id: int = Path(..., gt=0),
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Lista os membros (admins e members) de um workspace, com nome e e-mail
    de cada um, em ordem de entrada. Exige ser membro dele (admin ou member).
    """
    rows = (
        db.query(Membership, User)
        .join(User, User.id == Membership.user_id)
        .filter(Membership.workspace_id == workspace_id)
        .order_by(Membership.created_at, Membership.id)
        .all()
    )
    return [_to_member_response(m, u) for m, u in rows]

import os


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(
    workspace_id: int = Path(..., gt=0),
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Apaga um workspace inteiro: tutoriais, tabs, memberships e imagens
    associadas. Exige ser admin do workspace.

    O banco só tem ON DELETE CASCADE de tutorials para tutorial_steps/
    tutorial_images — não existe cascade automático de workspace até lá
    embaixo, então a exclusão é feita manualmente aqui, na ordem correta
    (tutorials primeiro, o que já dispara o cascade do banco para steps e
    imagens; depois tabs, memberships, e por fim o workspace). Os arquivos
    físicos de imagem são coletados antes do commit e removidos do disco
    só depois que a transação no banco for confirmada com sucesso.
    """
    from app.models.tab import Tab
    from app.models.tutorial import Tutorial
    from app.models.tutorial_image import TutorialImage

    tab_ids = [t.id for t in db.query(Tab.id).filter(Tab.workspace_id == workspace_id).all()]

    image_paths = []
    if tab_ids:
        tutorial_ids = [
            t.id for t in db.query(Tutorial.id).filter(Tutorial.tab_id.in_(tab_ids)).all()
        ]
        if tutorial_ids:
            image_paths = [
                img.image_url.lstrip("/")
                for img in db.query(TutorialImage).filter(TutorialImage.tutorial_id.in_(tutorial_ids)).all()
            ]
            db.query(Tutorial).filter(Tutorial.id.in_(tutorial_ids)).delete(synchronize_session=False)

    db.query(Tab).filter(Tab.workspace_id == workspace_id).delete(synchronize_session=False)
    db.query(Membership).filter(Membership.workspace_id == workspace_id).delete(synchronize_session=False)

    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace não encontrado")

    db.delete(workspace)
    db.commit()

    for path in image_paths:
        if os.path.exists(path):
            os.remove(path)