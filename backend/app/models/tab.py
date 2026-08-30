from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func

from app.database import Base


class Tab(Base):
    __tablename__ = "tabs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(120), nullable=False)
    description = Column(String(255), nullable=True)
    position = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

