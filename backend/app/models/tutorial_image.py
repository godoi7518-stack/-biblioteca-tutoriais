from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func

from app.database import Base


class TutorialImage(Base):
    __tablename__ = "tutorial_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tutorial_id = Column(Integer, ForeignKey("tutorials.id", ondelete="CASCADE"), nullable=False)
    step_id = Column(Integer, ForeignKey("tutorial_steps.id", ondelete="CASCADE"), nullable=True)
    image_url = Column(String(255), nullable=False)
    caption = Column(String(200), nullable=True)
    position = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())