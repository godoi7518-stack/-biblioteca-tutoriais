from pydantic import BaseModel, Field, field_validator


class TabBase(BaseModel):
    name: str
    description: str | None = None
    position: int = 0


class TabCreate(TabBase):
    """Corpo de criar e de editar (PUT) uma categoria. O PUT substitui todos
    os campos: para só renomear, envie também description e position atuais."""

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(None, max_length=255)

    @field_validator("name", mode="before")
    @classmethod
    def remover_espacos(cls, valor):
        return valor.strip() if isinstance(valor, str) else valor


class TabResponse(TabBase):
    id: int
    workspace_id: int

    class Config:
        from_attributes = True
