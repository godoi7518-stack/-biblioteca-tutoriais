from pydantic import BaseModel
from datetime import datetime


class TutorialImageResponse(BaseModel):
    id: int
    tutorial_id: int
    step_id: int | None = None
    image_url: str
    caption: str | None = None
    position: int
    created_at: datetime

    class Config:
        from_attributes = True