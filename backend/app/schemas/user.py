from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    """Dados do cadastro. As regras ficam aqui (e não só no frontend) porque
    qualquer um pode chamar a API direto, sem passar pela tela."""

    name: str = Field(min_length=1, max_length=120)
    matricula: str = Field(min_length=1, max_length=30)
    # bcrypt só considera os primeiros 72 bytes da senha, por isso o limite.
    password: str = Field(min_length=6, max_length=72)

    @field_validator("name", "matricula", mode="before")
    @classmethod
    def remover_espacos(cls, valor):
        """Tira espaços das pontas antes de validar o tamanho — assim
        " " não passa como nome/matrícula preenchidos."""
        return valor.strip() if isinstance(valor, str) else valor


class UserResponse(UserBase):
    id: int
    # Pode ser None para usuários cadastrados antes da matrícula existir.
    matricula: str | None = None
    # Chaves dos tours de onboarding já vistos (ver routers/auth.py).
    onboarding_seen: list[str] = []
    created_at: datetime

    @field_validator("onboarding_seen", mode="before")
    @classmethod
    def nulo_vira_lista(cls, valor):
        """No banco a coluna é NULL até o primeiro tour visto."""
        return valor or []

    class Config:
        from_attributes = True
