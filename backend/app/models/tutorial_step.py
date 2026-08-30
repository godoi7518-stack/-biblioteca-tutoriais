from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, func

from app.database import Base


class TutorialStep(Base):
    __tablename__ = "tutorial_steps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tutorial_id = Column(Integer, ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    title = Column(String(150), nullable=True)
    content = Column(Text, nullable=False)
    is_critical = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    