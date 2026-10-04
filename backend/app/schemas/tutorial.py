from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Literal

from app.models.membership import MembershipRole


class TutorialBase(BaseModel):
    title: str
    summary: str | None = None
    content_type: Literal["simple", "structured"] = "simple"
    content: str | None = None   # usado só quando content_type = "simple"


def _strip(valor):
    """Tira espaços das pontas antes de validar tamanho, para "   " não
    contar como campo preenchido."""
    return valor.strip() if isinstance(valor, str) else valor


class TutorialStepInput(BaseModel):
    """Um passo dentro do corpo de criar/editar tutorial.

    id = None → passo novo; id preenchido → passo que já existe (edição).
    Não tem step_number: a posição na lista enviada É a ordem do passo,
    o backend numera sozinho.
    """

    id: int | None = None
    title: str = Field(min_length=1, max_length=150)
    content: str = Field(min_length=1)
    is_critical: bool = False

    _strip_texts = field_validator("title", "content", mode="before")(_strip)


class TutorialCreate(BaseModel):
    """Corpo do POST: o tutorial e, se for "structured", todos os passos de
    uma vez (salvos na mesma transação)."""

    title: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(None, max_length=300)
    content_type: Literal["simple", "structured"] = "simple"
    content: str | None = None   # usado só quando content_type = "simple"
    steps: list[TutorialStepInput] | None = None   # usado só quando "structured"

    _strip_texts = field_validator("title", "summary", mode="before")(_strip)


class TutorialUpdate(BaseModel):
    """Corpo do PUT. Não tem content_type de propósito: o tipo é fixo
    depois de criado (converter arriscaria perder conteúdo)."""

    title: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(None, max_length=300)
    content: str | None = None
    steps: list[TutorialStepInput] | None = None

    _strip_texts = field_validator("title", "summary", mode="before")(_strip)


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


class TutorialDetailResponse(TutorialResponse):
    """Resposta de criar/editar: o tutorial com os passos já salvos, na
    ordem. O frontend precisa dos ids dos passos para enviar as imagens de
    cada um logo em seguida."""

    steps: list[TutorialStepResponse] = []

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
    # Onde a palavra foi encontrada, para a tela explicar por que o
    # resultado apareceu: "title", "summary", "content" ou "step".
    match_in: Literal["title", "summary", "content", "step"] | None = None
    match_step: int | None = None   # número do passo, quando match_in = "step"
    snippet: str | None = None      # trecho do texto em volta da palavra

    class Config:
        from_attributes = True


class TabSearchResult(BaseModel):
    """Categoria encontrada pelo nome na busca global."""

    id: int
    name: str
    workspace_id: int
    workspace_name: str
    workspace_role: MembershipRole
