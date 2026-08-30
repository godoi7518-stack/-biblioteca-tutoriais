from pydantic import BaseModel


class TabBase(BaseModel):
    name: str
    description: str | None = None
    position: int = 0


class TabCreate(TabBase):
    pass


class TabResponse(TabBase):
    id: int
    workspace_id: int

    class Config:
        from_attributes = True