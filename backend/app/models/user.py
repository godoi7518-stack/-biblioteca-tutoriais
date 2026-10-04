from sqlalchemy import Column, Integer, String, TIMESTAMP, JSON, func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    email = Column(String(190), unique=True, nullable=False)
    # Nullable só porque usuários antigos não têm matrícula; cadastros novos
    # são obrigados a informar (validação em schemas/user.py).
    matricula = Column(String(30), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    # Tours de onboarding que o usuário já viu (lista de chaves, ex.:
    # ["workspaces", "tabs-admin"]). Fica no banco, e não no navegador, para
    # valer em qualquer computador — inclusive máquinas compartilhadas.
    onboarding_seen = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())