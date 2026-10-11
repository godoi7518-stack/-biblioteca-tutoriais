from pydantic import BaseModel, Field, field_validator
from datetime import datetime

from app.models.membership import MembershipRole


class WorkspaceBase(BaseModel):
    name: str


class WorkspaceNameInput(BaseModel):
    """Nome enviado pelo usuário ao criar ou renomear um workspace.

    As regras ficam só na ENTRADA (e não no WorkspaceBase) para que a
    resposta nunca falhe por causa de um nome antigo já salvo no banco.
    Limite de 150 = tamanho da coluna workspaces.name (VARCHAR(150)): sem
    ele, um nome maior chegava no MySQL e virava erro 500.
    """

    name: str = Field(min_length=1, max_length=150)

    @field_validator("name", mode="before")
    @classmethod
    def remover_espacos(cls, valor):
        """Tira espaços das pontas antes de validar o tamanho — assim
        "   " não passa como nome preenchido."""
        return valor.strip() if isinstance(valor, str) else valor


class WorkspaceCreate(WorkspaceNameInput):
    pass


class WorkspaceUpdate(WorkspaceNameInput):
    """Corpo do PATCH /workspaces/{id}. Hoje só o nome é editável; se
    surgirem outros campos, entram aqui como opcionais."""
    pass


class WorkspaceResponse(WorkspaceBase):
    id: int
    owner_id: int
    created_at: datetime
    # Papel de QUEM FEZ A REQUISIÇÃO neste workspace (não é coluna da tabela
    # workspaces: vem de memberships). O frontend usa para decidir quais
    # botões mostrar; a permissão de verdade continua no require_admin.
    my_role: MembershipRole | None = None

    class Config:
        from_attributes = True

    @classmethod
    def with_role(cls, workspace, role: MembershipRole) -> "WorkspaceResponse":
        """Monta a resposta a partir do model Workspace + papel do usuário."""
        return cls(
            id=workspace.id,
            name=workspace.name,
            owner_id=workspace.owner_id,
            created_at=workspace.created_at,
            my_role=role,
        )
