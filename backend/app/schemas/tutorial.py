from pydantic import BaseModel
from datetime import datetime
from typing import Literal

from app.models.membership import MembershipRole


class TutorialBase(BaseModel):
    title: str
    summary: str | None = None
    content_type: Literal["simple", "structured"] = "simple"
    content: str | None = None   # usado só quando content_type = "simple"


class TutorialCreate(TutorialBase):
    pass


class TutorialResponse(TutorialBase):
    id: int
    tab_id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TutorialStepBase(BaseModel):
    step_number: int
    title: str | None = None
    content: str
    is_critical: bool = False


class TutorialStepCreate(TutorialStepBase):
    pass


class TutorialStepResponse(TutorialStepBase):
    id: int
    tutorial_id: int

    class Config:
        from_attributes = True

class TutorialSearchResult(BaseModel):
    id: int
    title: str
    summary: str | None = None
    content_type: Literal["simple", "structured"]
    tab_id: int
    tab_name: str
    workspace_id: int
    workspace_name: str
    # Papel do usuário no workspace do resultado. Necessário porque, ao abrir
    # um tutorial pela busca, o frontend não passou pela lista de workspaces
    # e não teria outra forma de saber se mostra os botões de admin.
    workspace_role: MembershipRole

    class Config:
        from_attributes = True