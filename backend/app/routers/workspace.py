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
    return db.query(Membership).filter(Membership.workspace_id == workspace_id).all()