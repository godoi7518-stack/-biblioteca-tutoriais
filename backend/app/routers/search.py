"""Busca full-text de tutoriais, abrangendo todos os workspaces do usuário.

Usa o índice FULLTEXT ft_search (title, summary, content) já existente no
schema.sql, em modo BOOLEAN com wildcard de prefixo — permite busca "ao
vivo" (encontra resultado a partir de poucas letras digitadas), diferente
do modo NATURAL LANGUAGE que exige palavras completas.
"""

import re
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.tutorial import TutorialSearchResult
from app.core.dependencies import get_current_user

router = APIRouter(tags=["search"])


def build_boolean_query(q: str) -> str:
    """Sanitiza a entrada e monta a sintaxe do modo BOOLEAN do MySQL.

    Remove caracteres com significado especial nesse modo (+ - < > ( ) ~ * " @)
    e transforma cada palavra em "+palavra*": o "+" exige que ela apareça,
    o "*" permite casar por prefixo (ex.: "cri" encontra "criar").
    Retorna string vazia se a query não sobrar nenhuma palavra válida.
    """
    words = re.findall(r"\w+", q)
    cleaned = [re.sub(r"[+\-<>()~*\"@]", "", w) for w in words]
    return " ".join(f"+{w}*" for w in cleaned if w)


@router.get("/search", response_model=list[TutorialSearchResult])
def search_tutorials(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Busca tutoriais por título/resumo/conteúdo. Exige apenas estar logado.

    Diferente das outras rotas, não é escopada a um workspace específico na
    URL: o JOIN com memberships filtra os resultados a todos os workspaces
    em que o usuário é membro (é essa junção que impede vazar conteúdo de
    workspaces alheios). Retorna lista vazia se a query sanitizada ficar
    vazia (ex.: usuário digitou só símbolos), em vez de mandar SQL malformado.
    Limitado aos 20 resultados mais relevantes.
    """
    boolean_query = build_boolean_query(q)
    if not boolean_query:
        return []

    rows = db.execute(
        text("""
            SELECT
                t.id, t.title, t.summary, t.content_type,
                tab.id AS tab_id, tab.name AS tab_name,
                w.id AS workspace_id, w.name AS workspace_name
            FROM tutorials t
            JOIN tabs tab ON tab.id = t.tab_id
            JOIN workspaces w ON w.id = tab.workspace_id
            JOIN memberships m ON m.workspace_id = w.id
            WHERE m.user_id = :user_id
              AND MATCH(t.title, t.summary, t.content) AGAINST (:q IN BOOLEAN MODE)
            ORDER BY MATCH(t.title, t.summary, t.content) AGAINST (:q IN BOOLEAN MODE) DESC
            LIMIT 20
        """),
        {"user_id": current_user.id, "q": boolean_query},
    ).mappings().all()

    return list(rows)