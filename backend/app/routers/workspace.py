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
from app.schemas.membership import MembershipInvite, MembershipResponse
from app.models.membership import Membership, MembershipRole
from app.core.dependencies import get_current_user, get_workspace_membership, require_admin

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


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


@router.post("/{workspace_id}/members", response_model=MembershipResponse)
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
    membro deste workspace.
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
    return membership


@router.get("/{workspace_id}/members", response_model=list[MembershipResponse])
def list_members(
    workspace_id: int = Path(..., gt=0),
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Lista os membros (admins e members) de um workspace. Exige ser membro dele."""
    return db.query(Membership).filter(Membership.workspace_id == workspace_id).all()