"""Busca global: workspaces e categorias (por nome) e tutoriais (full-text,
incluindo o texto dos passos), abrangendo todos os workspaces do usuário.

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
import unicodedata
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.tab import Tab
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


def search_tabs(db: Session, user_id: int, words: list[str]) -> list[dict]:
    """Categorias (tabs) dos workspaces do usuário cujo nome contém todas as
    palavras buscadas — mesma lógica de search_workspaces."""
    query = (
        db.query(Tab, Workspace.name, Membership.role)
        .join(Workspace, Workspace.id == Tab.workspace_id)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .filter(Membership.user_id == user_id)
    )
    for w in words:
        query = query.filter(Tab.name.like(f"%{escape_like(w)}%", escape="\\"))

    rows = query.order_by(Tab.name).limit(20).all()
    return [
        {
            "id": tab.id,
            "name": tab.name,
            "workspace_id": tab.workspace_id,
            "workspace_name": ws_name,
            "workspace_role": role,
        }
        for tab, ws_name, role in rows
    ]


# ---------- Onde a palavra apareceu (para explicar cada resultado) ----------

def normalize(texto: str) -> str:
    """Minúsculas e sem acento, mantendo UM caractere por caractere do
    original — assim a posição encontrada no texto normalizado vale também
    no texto original (usado para recortar o trecho)."""
    out = []
    for ch in texto:
        base = unicodedata.normalize("NFD", ch)[0].lower()
        out.append(base[0] if base else ch)
    return "".join(out)


def find_words(texto: str | None, words: list[str]) -> int | None:
    """Posição da primeira palavra buscada no texto, se TODAS aparecerem
    (como o modo BOOLEAN com "+palavra*" exige); senão None."""
    if not texto:
        return None
    norm = normalize(texto)
    positions = [norm.find(normalize(w)) for w in words]
    if any(p == -1 for p in positions):
        return None
    return min(positions)


def make_snippet(texto: str, pos: int, before: int = 60, after: int = 90) -> str:
    """Trecho curto em volta da posição encontrada, sem quebras de linha e
    sem os ** do negrito, com "…" quando corta o começo ou o fim."""
    start = max(0, pos - before)
    end = min(len(texto), pos + after)
    # Não corta palavras no meio.
    if start > 0:
        space = texto.rfind(" ", 0, start)
        start = space + 1 if space != -1 and pos - space < before + 20 else start
    if end < len(texto):
        space = texto.find(" ", end)
        end = space if space != -1 and space - end < 20 else end
    trecho = " ".join(texto[start:end].replace("**", "").split())
    return ("…" if start > 0 else "") + trecho + ("…" if end < len(texto) else "")


TUTORIAL_COLUMNS = """
    t.id, t.title, t.summary, t.content_type,
    tab.id AS tab_id, tab.name AS tab_name,
    w.id AS workspace_id, w.name AS workspace_name,
    m.role AS workspace_role
"""
# Só tutoriais de workspaces de que o usuário é membro: é esta junção que
# impede a busca de vazar conteúdo de outros workspaces.
TUTORIAL_JOINS = """
    JOIN tabs tab ON tab.id = t.tab_id
    JOIN workspaces w ON w.id = tab.workspace_id
    JOIN memberships m ON m.workspace_id = w.id
"""


def search_tutorials(db: Session, user_id: int, q: str, words: list[str]) -> list[dict]:
    """Tutoriais por título/resumo/texto (índice ft_search) OU pelo texto de
    algum passo (índice ft_steps). Cada resultado diz onde achou (match_in,
    match_step) e traz um trecho (snippet). Ordem: primeiro os que têm a
    palavra no título, depois por relevância. Até 20 resultados.
    """
    boolean_query = build_boolean_query(q)
    if not boolean_query:
        return []
    params = {"user_id": user_id, "q": boolean_query}

    by_title_etc = db.execute(
        text(f"""
            SELECT {TUTORIAL_COLUMNS}, t.content,
                   MATCH(t.title, t.summary, t.content) AGAINST (:q IN BOOLEAN MODE) AS score
            FROM tutorials t {TUTORIAL_JOINS}
            WHERE m.user_id = :user_id
              AND MATCH(t.title, t.summary, t.content) AGAINST (:q IN BOOLEAN MODE)
            ORDER BY score DESC
            LIMIT 50
        """),
        params,
    ).mappings().all()

    by_step = db.execute(
        text(f"""
            SELECT {TUTORIAL_COLUMNS},
                   ts.step_number, ts.title AS step_title, ts.content AS step_content,
                   MATCH(ts.title, ts.content) AGAINST (:q IN BOOLEAN MODE) AS score
            FROM tutorial_steps ts
            JOIN tutorials t ON t.id = ts.tutorial_id {TUTORIAL_JOINS}
            WHERE m.user_id = :user_id
              AND MATCH(ts.title, ts.content) AGAINST (:q IN BOOLEAN MODE)
            ORDER BY score DESC, ts.step_number
            LIMIT 100
        """),
        params,
    ).mappings().all()

    results: dict[int, dict] = {}

    for row in by_title_etc:
        item = {k: row[k] for k in row.keys() if k not in ("content", "score")}
        item["score"] = row["score"]
        if find_words(row["title"], words) is not None:
            item["match_in"] = "title"
        elif (pos := find_words(row["summary"], words)) is not None:
            item.update(match_in="summary", snippet=make_snippet(row["summary"], pos))
        elif (pos := find_words(row["content"], words)) is not None:
            item.update(match_in="content", snippet=make_snippet(row["content"], pos))
        results[row["id"]] = item

    for row in by_step:
        if row["id"] in results:
            continue  # já achado pelo título/resumo/texto, ou por um passo mais relevante
        item = {k: row[k] for k in row.keys() if k not in ("step_number", "step_title", "step_content", "score")}
        item.update(score=row["score"], match_in="step", match_step=row["step_number"])
        pos = find_words(row["step_content"], words)
        if pos is not None:
            item["snippet"] = make_snippet(row["step_content"], pos)
        else:
            item["snippet"] = row["step_title"] or make_snippet(row["step_content"], 0)
        results[row["id"]] = item

    ordered = sorted(results.values(), key=lambda r: (r.get("match_in") != "title", -float(r["score"] or 0)))
    for r in ordered:
        r.pop("score", None)
    return ordered[:20]


@router.get("/search", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=2),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Busca workspaces e categorias (pelo nome) e tutoriais (título, resumo,
    texto e passos). Exige apenas estar logado.

    Diferente das outras rotas, não é escopada a um workspace específico na
    URL: o JOIN com memberships, nas duas buscas, filtra os resultados aos
    workspaces em que o usuário é membro — é essa junção que impede vazar
    conteúdo de workspaces alheios.
    """
    words = extract_words(q)
    if not words:
        return SearchResponse(workspaces=[], tabs=[], tutorials=[])

    return SearchResponse(
        workspaces=search_workspaces(db, current_user.id, words),
        tabs=search_tabs(db, current_user.id, words),
        tutorials=search_tutorials(db, current_user.id, q, words),
    )
