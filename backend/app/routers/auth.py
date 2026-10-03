"""Rotas de autenticação: cadastro, login e dados do usuário logado."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import Token
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Cadastra um novo usuário (nome, e-mail, matrícula e senha). Rota pública.

    A senha é salva apenas como hash (bcrypt) em password_hash. Levanta 400
    se o e-mail ou a matrícula já estiverem cadastrados. O usuário criado
    não pertence a nenhum workspace: ele cria o próprio ou é convidado por
    um admin.
    """
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="E-mail já cadastrado")

    if db.query(User).filter(User.matricula == data.matricula).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Matrícula já cadastrada")

    user = User(
        name=data.name,
        email=data.email,
        matricula=data.matricula,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Dois cadastros iguais quase ao mesmo tempo passam pelas checagens
        # acima; o UNIQUE do banco barra o segundo e caímos aqui.
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail ou matrícula já cadastrados",
        )
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Autentica por e-mail/senha e retorna um JWT. Rota pública.

    Usa OAuth2PasswordRequestForm, então o corpo é x-www-form-urlencoded
    (não JSON), com o e-mail no campo "username". Levanta 401 se o e-mail
    não existir ou a senha estiver incorreta (mensagem genérica de propósito,
    para não revelar qual dos dois está errado).
    """
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retorna os dados do usuário dono do token enviado. Exige login.

    Não faz nenhuma query extra: get_current_user já busca o usuário no
    banco ao validar o token, essa rota só repassa o resultado.
    """
    return current_user