"""Dependências de autenticação e autorização reutilizadas pelas rotas.

Toda rota protegida da API usa alguma combinação destas três funções via
Depends(): get_current_user (exige apenas login), get_workspace_membership
(exige pertencer ao workspace) e require_admin (exige ser admin do workspace).
"""

from fastapi import Depends, HTTPException, status, Path
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.models.membership import Membership, MembershipRole
from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Decodifica o JWT do header Authorization e retorna o usuário logado.

    Levanta 401 se o token for inválido/expirado ou se o usuário do token
    não existir mais no banco. Base para todas as outras dependências de
    autorização abaixo.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


def get_workspace_membership(
    workspace_id: int = Path(..., gt=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Membership:
    """Garante que o usuário logado pertence ao workspace da URL.

    Usada em qualquer rota que tenha {workspace_id} no path. Levanta 403 se
    o usuário não for membro (nem admin, nem member) daquele workspace, e
    422 automaticamente se workspace_id não for um inteiro positivo válido
    (validação feita aqui, não na rota, para valer também em dependências
    encadeadas como require_admin).
    """
    membership = (
        db.query(Membership)
        .filter(Membership.workspace_id == workspace_id, Membership.user_id == current_user.id)
        .first()
    )
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pertence a este workspace",
        )
    return membership


def require_admin(membership: Membership = Depends(get_workspace_membership)) -> Membership:
    """Restringe a rota a quem é admin do workspace.

    Reaproveita get_workspace_membership (portanto já garante membership
    válida) e levanta 403 adicional se o papel não for ADMIN. Usada em toda
    operação de escrita (criar/editar/apagar tab, tutorial, imagem, convite).
    """
    if membership.role != MembershipRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem realizar esta ação",
        )
    return membership