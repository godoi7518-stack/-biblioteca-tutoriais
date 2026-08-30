from sqlalchemy import Column, Integer, String, Text, Enum, TIMESTAMP, ForeignKey, func

from app.database import Base


class Tutorial(Base):
    __tablename__ = "tutorials"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tab_id = Column(Integer, ForeignKey("tabs.id"), nullable=False)
    title = Column(String(200), nullable=False)
    summary = Column(String(300), nullable=True)
    content_type = Column(Enum("simple", "structured", name="content_type_enum"), nullable=False, default="simple")
    content = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())