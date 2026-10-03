from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.membership import MembershipRole


class MembershipInvite(BaseModel):
    email: EmailStr
    role: MembershipRole = MembershipRole.MEMBER


class MemberRoleUpdate(BaseModel):
    """Corpo do PATCH de troca de papel de um membro."""

    role: MembershipRole


class MemberResponse(BaseModel):
    """Membro de um workspace: dados da Membership + nome/e-mail do User.

    id e created_at são da Membership (created_at = data de entrada no
    workspace, não a data de cadastro do usuário).
    """

    id: int
    user_id: int
    name: str
    email: EmailStr
    role: MembershipRole
    created_at: datetime

    class Config:
        from_attributes = True
