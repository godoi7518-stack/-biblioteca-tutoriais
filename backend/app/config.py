"""Configurações lidas do arquivo .env (ou das variáveis de ambiente do
servidor, no deploy). Cada campo aqui vira uma variável em MAIÚSCULAS:
db_host → DB_HOST. Campos sem valor padrão são obrigatórios: sem eles a
API nem sobe, e o erro diz qual está faltando.

Lista completa com exemplos: backend/.env.example.
"""

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Banco de dados ---
    db_host: str
    db_port: int
    db_user: str
    db_password: str
    db_name: str
    # Imprime todo o SQL no terminal. Útil só para depurar: deixa o log
    # ilegível e esconde as linhas de erro.
    db_echo: bool = False
    # Caminho do certificado (CA) do banco, para conexão criptografada.
    # Vazio = sem SSL (MySQL local). Bancos na nuvem como a Aiven exigem.
    db_ssl_ca: str = ""

    # --- Autenticação ---
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

    # --- Frontend ---
    # Endereços do frontend que podem chamar a API (CORS), separados por
    # vírgula. Ex.: "http://localhost:5173,https://meusite.onrender.com"
    cors_origins: str = "http://localhost:5173"

    # --- Imagens ---
    # "local" = pasta static/uploads (desenvolvimento).
    # "r2" = Cloudflare R2 (produção: o disco de hospedagem grátis é
    # apagado a cada reinício, então as imagens não podem ficar nele).
    storage_backend: str = "local"
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = ""
    # Endereço público do bucket, sem "/" no fim.
    # Ex.: "https://pub-xxxxxxxx.r2.dev"
    r2_public_url: str = ""

    class Config:
        env_file = ".env"

    @property
    def cors_origin_list(self) -> list[str]:
        """cors_origins como lista, sem espaços e sem "/" no fim (o
        navegador manda a origem sem barra, e com barra o CORS não bate)."""
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def conferir_armazenamento(self):
        """Falha ao subir a API se o armazenamento estiver mal configurado,
        em vez de só descobrir no primeiro upload."""
        if self.storage_backend not in ("local", "r2"):
            raise ValueError('STORAGE_BACKEND deve ser "local" ou "r2"')
        if self.storage_backend == "r2":
            faltando = [
                nome.upper()
                for nome in ("r2_account_id", "r2_access_key_id", "r2_secret_access_key", "r2_bucket", "r2_public_url")
                if not getattr(self, nome)
            ]
            if faltando:
                raise ValueError(f"STORAGE_BACKEND=r2 exige: {', '.join(faltando)}")
            self.r2_public_url = self.r2_public_url.rstrip("/")
        return self


settings = Settings()
