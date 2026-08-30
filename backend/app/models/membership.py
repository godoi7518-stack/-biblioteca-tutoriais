from sqlalchemy import Column, Integer, Enum, TIMESTAMP, ForeignKey, UniqueConstraint, func

from app.database import Base


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    role = Column(Enum("admin", "member", name="role_enum"), nullable=False, default="member")
    created_at = Column(TIMESTAMP, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "workspace_id", name="uq_user_group"),
    )