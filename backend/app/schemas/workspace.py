from pydantic import BaseModel
from datetime import datetime

from app.models.membership import MembershipRole


class WorkspaceBase(BaseModel):
    name: str


class WorkspaceCreate(WorkspaceBase):
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
