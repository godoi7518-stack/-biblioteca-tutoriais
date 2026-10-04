from pydantic import BaseModel

from app.schemas.workspace import WorkspaceResponse
from app.schemas.tutorial import TutorialSearchResult, TabSearchResult


class SearchResponse(BaseModel):
    """Resultado de GET /search, separado por tipo para o frontend poder
    mostrar cada grupo do seu jeito (workspace abre a lista de categorias,
    categoria abre o workspace nela, tutorial abre o tutorial)."""

    workspaces: list[WorkspaceResponse]
    tabs: list[TabSearchResult] = []
    tutorials: list[TutorialSearchResult]
