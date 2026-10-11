from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# URL.create em vez de montar o texto na mão: senhas geradas pela
# hospedagem costumam ter caracteres como "@", ":" ou "/", que quebrariam
# um "mysql://usuario:senha@host" escrito com f-string.
DATABASE_URL = URL.create(
    "mysql+mysqlconnector",
    username=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
    database=settings.db_name,
)

connect_args = {}
if settings.db_ssl_ca:
    # Conexão criptografada, conferindo o certificado do servidor.
    connect_args = {"ssl_ca": settings.db_ssl_ca, "ssl_verify_cert": True}

engine = create_engine(
    DATABASE_URL,
    echo=settings.db_echo,
    connect_args=connect_args,
    # Testa a conexão antes de usar. Quando o servidor grátis "dorme" ou o
    # banco derruba conexões paradas, a conexão guardada no pool morre; sem
    # isso, a primeira requisição depois do sono daria erro 500.
    pool_pre_ping=True,
    # Renova conexões com mais de 5 minutos, antes que o banco as derrube.
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
