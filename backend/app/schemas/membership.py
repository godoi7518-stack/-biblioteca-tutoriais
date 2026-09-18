from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.membership import MembershipRole


class MembershipInvite(BaseModel):
    email: EmailStr
    role: MembershipRole = MembershipRole.MEMBER


class MembershipResponse(BaseModel):
    id: int
    user_id: int
    workspace_id: int
    role: MembershipRole
    created_at: datetime

    class Config:
        from_attributes = True