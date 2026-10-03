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
from app.schemas.membership import MembershipInvite, MemberResponse, MemberRoleUpdate
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

    return WorkspaceResponse.with_role(workspace, MembershipRole.ADMIN)


@router.get("", response_model=list[WorkspaceResponse])
def list_my_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista os workspaces em que o usuário logado é membro (admin ou member),
    cada um com o papel dele (my_role).

    O papel já vem na mesma query: o JOIN com memberships existia para
    filtrar os workspaces do usuário, então basta pedir a coluna role junto.
    """
    rows = (
        db.query(Workspace, Membership.role)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .filter(Membership.user_id == current_user.id)
        .order_by(Workspace.created_at, Workspace.id)
        .all()
    )
    return [WorkspaceResponse.with_role(ws, role) for ws, role in rows]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: int = Path(..., gt=0),
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """Retorna um workspace específico, com o papel do usuário (my_role).
    Exige ser membro dele (admin ou member).
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace não encontrado")
    return WorkspaceResponse.with_role(workspace, membership.role)


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


LAST_ADMIN_DETAIL = "O workspace precisa ter pelo menos um admin."


def _get_member_of_workspace(db: Session, workspace_id: int, membership_id: int) -> Membership:
    """Busca a membership pelo id GARANTINDO que ela é deste workspace.

    Sem o filtro por workspace_id, um admin do workspace 1 poderia alterar
    ou remover alguém do workspace 2 só trocando o id na URL (o
    require_admin só confere o workspace da URL, não o membro alvo).
    """
    target = (
        db.query(Membership)
        .filter(Membership.id == membership_id, Membership.workspace_id == workspace_id)
        .first()
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membro não encontrado neste workspace")
    return target


def _ensure_not_last_admin(db: Session, workspace_id: int, target: Membership, detail: str = LAST_ADMIN_DETAIL):
    """Levanta 400 se target for o único admin do workspace.

    Chamada antes de rebaixar ou remover alguém. Se o alvo não é admin,
    não há risco e retorna direto. O with_for_update() trava as linhas de
    admins até o commit: sem isso, dois admins se rebaixando ao mesmo tempo
    passariam os dois pela contagem (cada um vê "2 admins") e o workspace
    ficaria sem nenhum admin.
    """
    if target.role != MembershipRole.ADMIN:
        return

    admins = (
        db.query(Membership)
        .filter(Membership.workspace_id == workspace_id, Membership.role == MembershipRole.ADMIN)
        .with_for_update()
        .all()
    )
    if len(admins) <= 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


@router.patch("/{workspace_id}/members/{membership_id}", response_model=MemberResponse)
def update_member_role(
    data: MemberRoleUpdate,
    workspace_id: int = Path(..., gt=0),
    membership_id: int = Path(..., gt=0),
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Troca o papel (admin/member) de um membro. Exige ser admin do workspace.

    O admin pode rebaixar a si mesmo, desde que não seja o último admin
    (400). Levanta 404 se membership_id não for um membro deste workspace.
    O dono (quem criou o workspace) é tratado como qualquer admin.
    """
    target = _get_member_of_workspace(db, workspace_id, membership_id)

    if data.role != target.role:
        if data.role == MembershipRole.MEMBER:
            _ensure_not_last_admin(db, workspace_id, target)
        target.role = data.role
        db.commit()
        db.refresh(target)

    user = db.query(User).filter(User.id == target.user_id).first()
    return _to_member_response(target, user)


@router.delete("/{workspace_id}/members/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    workspace_id: int = Path(..., gt=0),
    membership_id: int = Path(..., gt=0),
    admin: Membership = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove um membro do workspace. Exige ser admin do workspace.

    Apaga só o vínculo (membership): a conta do usuário e os tutoriais que
    ele criou continuam existindo. Não deixa remover o último admin (400).
    Levanta 404 se membership_id não for um membro deste workspace.
    """
    target = _get_member_of_workspace(db, workspace_id, membership_id)
    _ensure_not_last_admin(db, workspace_id, target)
    db.delete(target)
    db.commit()


@router.post("/{workspace_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_workspace(
    workspace_id: int = Path(..., gt=0),
    membership: Membership = Depends(get_workspace_membership),
    db: Session = Depends(get_db),
):
    """O próprio usuário sai do workspace. Qualquer membro pode chamar.

    Se quem sai é o último admin, levanta 400: ele precisa promover outra
    pessoa antes, ou apagar o workspace.
    """
    _ensure_not_last_admin(
        db,
        workspace_id,
        membership,
        detail="Você é o único admin. Promova outro membro a admin antes de sair, ou apague o workspace.",
    )
    db.delete(membership)
    db.commit()

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