"""Onde ficam os arquivos de imagem: disco local ou Cloudflare R2.

As rotas não sabem qual dos dois está em uso: só chamam save_image() e
delete_images(). Quem escolhe é STORAGE_BACKEND no .env:

- "local": grava em static/uploads/... e a URL salva no banco é relativa
  ("/static/uploads/tutorials/1/abc.jpg"); o frontend completa com o
  endereço da API.
- "r2": envia para o bucket do R2 e a URL salva é completa
  ("https://pub-xxx.r2.dev/tutorials/1/abc.jpg").

O delete_images() olha cada URL e apaga de onde ela veio. Assim, um banco
com imagens antigas locais e novas no R2 continua funcionando.
"""

import logging
import os
import uuid

from app.config import settings

logger = logging.getLogger(__name__)

LOCAL_UPLOAD_DIR = "static/uploads"

_r2_client = None


def _get_r2_client():
    """Cria o cliente do R2 só na primeira vez que for usado. O boto3 só é
    importado aqui: quem roda local não precisa dele configurado."""
    global _r2_client
    if _r2_client is None:
        import boto3

        _r2_client = boto3.client(
            "s3",  # o R2 fala a mesma "língua" (API) do Amazon S3
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
        )
    return _r2_client


def save_image(contents: bytes, tutorial_id: int, extension: str, content_type: str) -> str:
    """Guarda a imagem e devolve a URL que vai para tutorial_images.image_url.

    O nome do arquivo é um uuid4 aleatório (nunca o nome original): evita
    colisão entre uploads e nome de arquivo malicioso.
    """
    key = f"tutorials/{tutorial_id}/{uuid.uuid4().hex}{extension}"

    if settings.storage_backend == "r2":
        _get_r2_client().put_object(
            Bucket=settings.r2_bucket,
            Key=key,
            Body=contents,
            ContentType=content_type,
        )
        return f"{settings.r2_public_url}/{key}"

    file_path = os.path.join(LOCAL_UPLOAD_DIR, key)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(contents)
    return "/" + file_path.replace(os.sep, "/")


def delete_images(image_urls: list[str]) -> None:
    """Apaga os arquivos dessas URLs. Chamar só DEPOIS do commit no banco.

    Nunca lança erro: a essa altura as linhas já foram apagadas, e um
    arquivo que sobrou é bem menos grave que responder erro 500 para uma
    exclusão que deu certo. Falhas vão para o log do servidor.
    """
    for url in image_urls:
        try:
            if url.startswith("http"):
                prefix = f"{settings.r2_public_url}/"
                if settings.r2_public_url and url.startswith(prefix):
                    _get_r2_client().delete_object(Bucket=settings.r2_bucket, Key=url[len(prefix):])
                else:
                    logger.warning("Imagem com URL desconhecida não foi apagada: %s", url)
            else:
                path = url.lstrip("/")
                if os.path.exists(path):
                    os.remove(path)
        except Exception:
            logger.exception("Falha ao apagar a imagem %s", url)
