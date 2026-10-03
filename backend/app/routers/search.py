"""Busca global: workspaces (por nome) e tutoriais (full-text), abrangendo
todos os workspaces do usuário.

Tutoriais usam o índice FULLTEXT ft_search (title, summary, content) já
existente no schema do banco (database/tutorial biblioteca.sql), em modo
BOOLEAN com wildcard de prefixo — permite busca "ao vivo" (encontra
resultado a partir de poucas letras digitadas), diferente do modo NATURAL
LANGUAGE que exige palavras completas.

Workspaces usam LIKE simples no nome: não existe índice FULLTEXT nessa
tabela, e não precisa — cada usuário participa de poucos workspaces, e o
filtro por membership já reduz a busca a essas poucas linhas.
"""

import re
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.membership import Membership
from app.schemas.workspace import WorkspaceResponse
from app.schemas.search import SearchResponse
from app.core.dependencies import get_current_user

router = APIRouter(tags=["search"])


def extract_words(q: str) -> list[str]:
    """Quebra a busca em palavras (letras, números e _), descartando símbolos."""
    return re.findall(r"\w+", q)


def build_boolean_query(q: str) -> str:
    """Sanitiza a entrada e monta a sintaxe do modo BOOLEAN do MySQL.

    Remove caracteres com significado especial nesse modo (+ - < > ( ) ~ * " @)
    e transforma cada palavra em "+palavra*": o "+" exige que ela apareça,
    o "*" permite casar por prefixo (ex.: "cri" encontra "criar").
    Retorna string vazia se a query não sobrar nenhuma palavra válida.
    """
    cleaned = [re.sub(r"[+\-<>()~*\"@]", "", w) for w in extract_words(q)]
    return " ".join(f"+{w}*" for w in cleaned if w)


def escape_like(word: str) -> str:
    """Escapa os curingas do LIKE (% e _) para que sejam buscados como texto.
    Sem isso, buscar "a_b" casaria "aXb", porque "_" significa "qualquer
    caractere" no LIKE."""
    return word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_workspaces(db: Session, user_id: int, words: list[str]) -> list[WorkspaceResponse]:
    """Workspaces do usuário cujo nome contém TODAS as palavras buscadas, em
    qualquer posição ("manut" encontra "Equipe de Manutenção").

    Maiúsculas/minúsculas e acentos são ignorados pela collation padrão do
    MySQL 8 (utf8mb4_0900_ai_ci), então "manutencao" também encontra
    "Manutenção".
    """
    query = (
        db.query(Workspace, Membership.role)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .filter(Membership.user_id == user_id)
    )
    for w in words:
        query = query.filter(Workspace.name.like(f"%{escape_like(w)}%", escape="\\"))

    rows = query.order_by(Workspace.name).limit(20).all()
    return [WorkspaceResponse.with_role(ws, role) for ws, role in rows]


def search_tutorials(db: Session, user_id: int, q: str) -> list[dict]:
    """Tutoriais por título/resumo/conteúdo, via FULLTEXT. Limitado aos 20
    mais relevantes. Retorna lista vazia se a query sanitizada ficar vazia
    (ex.: só símbolos), em vez de mandar SQL malformado."""
    boolean_query = build_boolean_query(q)
    if not boolean_query:
        return []

    rows = db.execute(
        text("""
            SELECT
                t.id, t.title, t.summary, t.content_type,
                tab.id AS tab_id, tab.name AS tab_name,
                w.id AS workspace_id, w.name AS workspace_name,
                m.role AS workspace_role
            FROM tutorials t
            JOIN tabs tab ON tab.id = t.tab_id
            JOIN workspaces w ON w.id = tab.workspace_id
            JOIN memberships m ON m.workspace_id = w.id
            WHERE m.user_id = :user_id
              AND MATCH(t.title, t.summary, t.content) AGAINST (:q IN BOOLEAN MODE)
            ORDER BY MATCH(t.title, t.summary, t.content) AGAINST (:q IN BOOLEAN MODE) DESC
            LIMIT 20
        """),
        {"user_id": user_id, "q": boolean_query},
    ).mappings().all()
    return list(rows)


@router.get("/search", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Busca workspaces (pelo nome) e tutoriais (título/resumo/conteúdo).
    Exige apenas estar logado.

    Diferente das outras rotas, não é escopada a um workspace específico na
    URL: o JOIN com memberships, nas duas buscas, filtra os resultados aos
    workspaces em que o usuário é membro — é essa junção que impede vazar
    conteúdo de workspaces alheios.
    """
    words = extract_words(q)
    if not words:
        return SearchResponse(workspaces=[], tutorials=[])

    return SearchResponse(
        workspaces=search_workspaces(db, current_user.id, words),
        tutorials=search_tutorials(db, current_user.id, q),
    )
