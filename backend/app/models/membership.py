import enum
from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.sql import func
from app.database import Base


class MembershipRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    role = Column(
        SAEnum(MembershipRole, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        nullable=False,
        default=MembershipRole.MEMBER,
    )
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "workspace_id", name="uq_user_group"),
    )